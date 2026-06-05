# Investigation: Tekton Custom Task for Agent Sandbox

**Date:** 2026-06-05
**Authors:** David Zager
**Status:** Investigation
**Related:** [ADR 0001](../adr/0001-agentic-platform-crd-architecture.md)

## Summary

Investigate contributing a Tekton Custom Task controller that bridges
Tekton Pipelines with kubernetes-sigs/agent-sandbox. This would allow
agent workloads to participate in Tekton Pipelines as first-class
tasks, with Agent Sandbox providing the execution environment and
Tekton providing the orchestration.

ADR 0001 currently positions Tekton as an alternative to Agent Sandbox.
This investigation explores making them complementary: Tekton for
orchestration, Agent Sandbox for execution.

## Background

### Tekton Custom Tasks (TEP-0002)

Tekton Pipelines support [Custom Tasks](https://github.com/tektoncd/community/blob/main/teps/0002-custom-tasks.md)
— an extension point that lets any CRD act as a task in a Pipeline.
When a Pipeline references a task with a non-standard `apiVersion` and
`kind`, the PipelineRun controller creates a `CustomRun` object. A
custom controller watches these objects, performs work, and updates the
status to signal completion.

The contract is simple:

1. Watch `CustomRun` objects that reference your CRD type.
2. Do your work.
3. Update `CustomRun` status: `Succeeded: True` or `Succeeded: False`.
4. Optionally report results via `status.results`.

Tekton enforces a configurable initial update timeout (~30s default) to
prevent pipelines from hanging if the custom controller is unavailable.

### Agent Sandbox API

[Agent Sandbox](https://github.com/kubernetes-sigs/agent-sandbox)
(agents.x-k8s.io/v1beta1) provides:

- **Sandbox**: Single stateful pod with stable identity, persistent
  storage, and lifecycle management. Has a `Finished` condition with
  `PodSucceeded` / `PodFailed` reasons — the completion signal Tekton
  needs.
- **SandboxTemplate**: Reusable pod template with network policy and
  security defaults.
- **SandboxClaim**: User-facing abstraction that provisions a Sandbox
  from a template or warm pool.
- **SandboxWarmPool**: Pre-warmed pod pool for near-instant allocation.

Agent Sandbox explicitly does NOT provide orchestration. Chaining
multiple Sandboxes, ordering phases, handling retries — these are the
consumer's responsibility. Tekton would fill this gap.

## Proposed Design

### New CRD: SandboxTask

A task definition that describes what Sandbox to run and how to
configure it. Inert by itself — only executes when Tekton creates a
CustomRun referencing it.

```yaml
apiVersion: agents.x-k8s.io/v1beta1
kind: SandboxTask
metadata:
  name: java-migration-phase
spec:
  sandboxTemplateRef:
    name: java-agent-template

  # Optional: claim from warm pool for fast starts
  warmPoolRef:
    name: java-agent-pool

  # Environment variables injected into the Sandbox
  env:
    - name: AGENT_INSTRUCTIONS
      value: "Migrate javax imports to jakarta..."

  # Where to find results after execution
  results:
    - name: report
      path: /.konveyor/results.json
```

### Tekton Pipeline using SandboxTasks

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: javaee-to-quarkus
spec:
  params:
    - name: app-id
    - name: hub-url
  workspaces:
    - name: source

  tasks:
    - name: analyze-dependencies
      taskRef:
        apiVersion: agents.x-k8s.io/v1beta1
        kind: SandboxTask
        name: analyze-deps-task
      workspaces:
        - name: source
          workspace: source
      params:
        - name: APP_ID
          value: $(params.app-id)

    - name: migrate-pom
      taskRef:
        apiVersion: agents.x-k8s.io/v1beta1
        kind: SandboxTask
        name: migrate-pom-task
      runAfter: [analyze-dependencies]
      workspaces:
        - name: source
          workspace: source

    - name: migrate-imports
      taskRef:
        apiVersion: agents.x-k8s.io/v1beta1
        kind: SandboxTask
        name: migrate-imports-task
      runAfter: [migrate-pom]
      workspaces:
        - name: source
          workspace: source

    - name: review
      taskRef:
        apiVersion: agents.x-k8s.io/v1beta1
        kind: SandboxTask
        name: code-review-task
      runAfter: [migrate-imports]
      workspaces:
        - name: source
          workspace: source

  finally:
    - name: report
      taskRef:
        name: publish-results
```

### Controller behavior

The custom controller watches `CustomRun` objects referencing
`SandboxTask` and bridges to Agent Sandbox:

```
CustomRun created (by Tekton PipelineRun controller)
  -> Read the referenced SandboxTask spec
  -> Create a SandboxClaim (or Sandbox)
       - Mount the Tekton workspace PVC into the Sandbox
       - Inject params as env vars
       - Reference the SandboxTemplate for image + skills
       - If warmPoolRef is set, claim from warm pool
  -> Watch the Sandbox status
  -> On Sandbox condition Finished=True:
       - PodSucceeded -> CustomRun Succeeded=True
       - PodFailed    -> CustomRun Succeeded=False
  -> Extract results from workspace paths
       -> Write to CustomRun status.results
```

### Session continuity via Tekton Workspaces

The current Konveyor execution model uses PVC-backed session
continuity:

- Each phase creates its own Sandbox
- Phases within a stage resume the agent session via shared PVC
  (goose: `GOOSE_PATH_ROOT` + `goose run --resume --session-id <ID>`)
- Stage boundaries use a new session ID for fresh context

This maps directly to Tekton Workspaces:

- Tekton Workspace backed by a PVC
- Multiple tasks sharing the same workspace = same PVC
- Phases within a stage share workspace + session ID -> resume
- Stage boundaries = different session ID, same workspace PVC
- The agent base image entrypoint handles session discovery and
  resumption from the PVC mount

## What Tekton provides for free

Capabilities that Konveyor would otherwise need to build into its own
AgentPlanRun controller:

| Capability | Without Tekton | With Tekton |
|---|---|---|
| Task ordering | Custom controller | `runAfter` |
| Parallel execution | Custom controller | Implicit (no deps = parallel) |
| Retries | Custom controller | `retries: N` per task |
| Conditional execution | Custom controller | `when` expressions |
| Cleanup / finally | Custom controller | `finally` tasks |
| Timeouts | Custom controller | `timeout` per task and pipeline |
| Result passing | Custom controller | `$(tasks.foo.results.bar)` |
| Event triggering | Custom controller | Tekton Triggers |
| Supply chain signing | Custom controller | Tekton Chains (SLSA) |
| Dashboard / UI | Custom UI | Tekton Dashboard |

## Where to contribute

### Option A: Extension in kubernetes-sigs/agent-sandbox

The natural home alongside SandboxTemplate, SandboxClaim, and
SandboxWarmPool. Ships as an optional controller. Requires Tekton
Pipelines to be installed.

Pros: Co-located with the core API, shared maintainers.
Cons: Adds a Tekton dependency to the agent-sandbox project.

### Option B: Standalone repo (kubernetes-sigs/ or tektoncd/)

A separate project that depends on both Tekton and Agent Sandbox.

Pros: Clean dependency boundaries.
Cons: Another repo to maintain, harder to discover.

### Option C: Tekton ecosystem catalog

A community-contributed task type in the Tekton catalog.

Pros: Discoverable by Tekton users.
Cons: Less control over the project direction.

## Impact on Konveyor CRDs

If Tekton handles orchestration, the relationship between Konveyor
CRDs and Tekton resources would be:

| Konveyor CRD | Tekton equivalent | Role |
|---|---|---|
| AgentPlan | Tekton Pipeline | Defines stages and phases |
| AgentPlanRun | Tekton PipelineRun | Triggers execution |
| Agent | (none — stays ours) | Defines agent config |
| AgentRun | CustomRun + SandboxTask | Triggers a single phase |

Two integration strategies:

**Strategy 1 — Tekton as an alternative orchestrator.** Keep
AgentPlan/AgentPlanRun with their own controller. Users who want
Tekton can build Pipelines directly using SandboxTasks. Konveyor
supports both paths.

**Strategy 2 — Tekton as the orchestration engine.** The
AgentPlanRun controller generates a Tekton PipelineRun under the
hood. Konveyor CRDs remain the user-facing abstraction; Tekton is
an implementation detail. Users get the Konveyor UX without knowing
Tekton is involved, but advanced users can drop down to raw
Pipelines.

Strategy 1 is simpler and avoids a hard dependency on Tekton.
Strategy 2 eliminates the need to build orchestration logic but
couples the platform to Tekton's availability.

## Open questions

1. **Timeout model.** Agent workloads can run for hours. Tekton's
   default task timeout is 1 hour. How should long-running agent
   tasks interact with Tekton's timeout enforcement?

2. **Warm pool lifecycle.** SandboxWarmPool pre-provisions pods.
   Tekton manages workspace PVCs. Who owns the lifecycle of the
   warm pool — Tekton, the Konveyor controller, or the platform
   admin?

3. **Result extraction.** How does the controller know the agent is
   done and where to find results? The Sandbox `Finished` condition
   signals pod termination, but the agent might write results to
   various paths. Convention (e.g., `/.konveyor/results.json`) or
   configuration?

4. **Tekton availability.** Is Tekton (or OpenShift Pipelines) a
   reasonable dependency? It ships with OpenShift but is optional
   on vanilla Kubernetes. Strategy 1 avoids this; Strategy 2
   requires it.

5. **Community appetite.** Would the Agent Sandbox maintainers
   accept a Tekton extension? Would the Tekton community want a
   SandboxTask type? Early conversations with both communities
   would de-risk the contribution.

## Next steps

- [ ] Prototype the controller: CustomRun -> SandboxClaim bridge
- [ ] Test session resumption across Tekton tasks sharing a workspace
- [ ] Engage agent-sandbox maintainers on the extension idea
- [ ] Engage Tekton community on the custom task type
- [ ] Evaluate Strategy 1 vs Strategy 2 for Konveyor's needs
