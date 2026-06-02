# ADR 0001: Agentic Platform CRD Architecture

**Status:** Proposed
**Date:** 2026-06-01
**Authors:** David Zager, Dylan Murray

## Context

Konveyor's POC for AI-powered code migration (tackle2-addon-kai) proved
that an AI agent running in a container can clone a repo, fetch analysis
results from Hub, apply migration skills, and push a branch. The POC
used Hub's addon framework to launch the agent container and pallet to
sync skills at runtime.

To move toward a release we need to simplify the architecture and
deliver domain-agnostic building blocks that are not coupled to Hub's
task lifecycle. The goals are:

1. Define the core primitives as Kubernetes CRDs so they are portable,
   GitOps-friendly, and not tied to Hub's API.
2. Align with the skillimage project (redhat-et) for skill packaging
   and distribution rather than inventing parallel concepts.
3. Leverage Agent Sandbox (k8s-sigs) for execution rather than
   building bespoke pod management.
4. Keep Hub as a valuable data service (analysis results, app metadata)
   without requiring it as the workload launcher.
5. Support multiple agent runtimes (goose, opencode, and future
   options) without baking runtime-specific concepts into the CRDs.

## Decision

### Five CRDs aligned with skillimage

We introduce five Custom Resource Definitions. The first two adopt
skillimage's existing YAML format as their CRD spec, aligning our
Kubernetes API with the emerging OCI skills ecosystem:

| CRD | Purpose |
|-----|---------|
| **SkillCard** | Individual skill or rule. Adopts skillimage.io/v1alpha1 SkillCard format. A `type: rule` field distinguishes always-loaded constraints from on-demand skills. References an OCI artifact. |
| **SkillCollection** | Group of skills from OCI image refs or git sources. Adopts skillimage.io/v1alpha1 SkillCollection format. |
| **LLMProvider** | LLM service endpoint, credentials (Secret ref), and available models with context window sizes and optional tier labels. Stored as JSON. |
| **Agent** | Binds SkillCards + SkillCollections + LLMProvider + container image + prompt. References skills both individually and via collections. |
| **AgentPlan** | High-level guide with ordered stages. Each stage groups phases sharing an Agent and context boundary. Each phase carries markdown instructions for the agent. |

### Naming alignment with skillimage

SkillCard and SkillCollection are skillimage's existing YAML metadata
formats. By adopting them as CRD kinds rather than inventing AgentSkill
and AgentRule, we:

- Align our Kubernetes API with the OCI skills ecosystem.
- Make a SkillCard file on a developer's laptop the same shape as a
  SkillCard CR in the cluster.
- Position Konveyor to contribute the CRD definitions upstream to
  skillimage as their Kubernetes story.
- Contribute `type: rule` support upstream for the skill-vs-rule
  distinction.

### Skill and rule packaging via skillimage

Skills and rules are packaged as OCI artifacts using
redhat-et/skillimage (`skillctl build`, `skillctl push`). This gives
us:

- Distribution through any OCI registry (Quay, Harbor, GHCR).
- Supply chain security (cosign signing, SLSA provenance, SBOMs).
- Kubernetes-native mounting via ImageVolumes (K8s 1.33+ / OpenShift
  4.20+) — read-only, cached by kubelet, no init container.
- A local development story (`skillctl install --target goose`) using
  the same artifacts.
- Lifecycle management (draft → testing → published → deprecated →
  archived).

Pallet's agent-native placement logic and governance model are
contributed upstream to skillimage rather than maintained as a separate
tool.

### CRDs as the backend — no Hub API for these resources

The UI talks directly to the Kubernetes API server for CRD CRUD
operations. The tackle2-ui Node.js server already acts as a reverse
proxy (forwarding `/hub` to the Hub API); we add a `/k8s` proxy route
that forwards to `kubernetes.default.svc` using the pod's service
account token. This eliminates the need for Hub backend changes (no
new Go models, no database migrations, no API handlers).

### Execution via Agent Sandbox

Agent workloads run as Agent Sandbox resources
(kubernetes-sigs/agent-sandbox). Agent Sandbox is single-container by
design — each Sandbox is one pod with one container image:

- **Agent → SandboxTemplate:** Generated with ImageVolumes for
  skills/rules, Secret env vars for LLM credentials, and the agent's
  container image.
- **AgentPlan stage → Sandbox lifecycle:** Phases within a stage
  share the same Sandbox (same Agent, full context continuity).
  Different stages get separate Sandboxes with a shared workspace PVC
  bridging context.
- **SandboxWarmPool:** Pre-allocated agent pods for running migrations
  at fleet scale.

### AgentPlan execution model

An AgentPlan's guide is written to the shared workspace as a context
file before any phase starts. Each phase's instructions are joined
with the Agent's prompt at execution time:

1. Plan Guide → workspace context file (ambient awareness)
2. Agent Prompt → standing instructions (how the agent operates)
3. Phase Instructions → specific task (what to do now)

Stages group phases that share a context boundary. Phases within a
stage execute sequentially in the same Sandbox. Stage transitions
create a new Sandbox; the shared workspace PVC carries repository
state and handoff documents across the boundary.

### Hub as a data service

Hub is not the workload launcher. The agent container calls Hub's API
at runtime for:

- Analysis results (`GET /hub/applications/{id}/analysis/issues`)
- Application metadata and git credentials

These are passed as environment variables (`HUB_BASE_URL`, `HUB_TOKEN`,
`APP_ID`) set on the Sandbox by the UI or controller.

### Subagent delegation is runtime-internal

Modern agent runtimes (goose, opencode, Claude Code) all support
in-process subagent delegation with isolated context, scoped tools, and
per-subagent model selection. The Agent CRD may reference other Agent
CRDs as subagents, but the delegation mechanics are handled by the
runtime inside the container — not by Kubernetes-level orchestration.

### Context budget validation

SkillCards with `type: rule` are always-loaded and LLMProvider models
declare context window sizes. The system can validate that an Agent's
total rule content fits within the selected model's context window,
preventing runtime failures from context overflow.

## Alternatives Considered

### Hub API resources instead of CRDs

The existing dymurray/agent branch defines AgentRecipe, AgentPlan, and
Agent as Hub API resources (`/hub/agents`, `/hub/agent-recipes`,
`/hub/agent-plans`). This couples the resources to Hub's lifecycle and
API surface. CRDs are portable, work with standard Kubernetes tooling
(kubectl, GitOps, RBAC), and can be consumed by non-Hub systems.

### Hub as temporary backend with CRD-shaped API

We considered reshaping Hub's API endpoints to match the CRD model
as a transitional step. This would require new Go models, database
migrations, and API handlers — significant work for temporary
plumbing. Talking directly to the K8s API via the UI's existing proxy
is simpler and proves the actual CRD model.

### Separate AgentSkill and AgentRule CRDs

Skills and rules have different activation semantics (on-demand vs
always-loaded). We considered separate CRDs to make this explicit.
However, skillimage's SkillCard format already supports a type field,
and using a single SkillCard CRD with `type: skill | rule` aligns
with skillimage's ecosystem. The activation semantic difference is
handled by the runtime based on the type field.

### pallet as runtime sync engine

The POC runs `pallet sync .` at container startup to fetch skills from
git repos. This adds network dependency and startup latency. OCI
artifacts via skillimage are pre-mounted by kubelet before the
container starts — faster, deterministic, and auditable via image
digests.

### Custom pod/job creation instead of Agent Sandbox

We considered having the controller or UI create bare Pods or Jobs
directly. Agent Sandbox provides lifecycle management (hibernation,
warm pools, stable identity, network isolation) that we would
otherwise need to build ourselves.

### Tekton as the execution layer

Tekton Tasks/Pipelines were considered for orchestrating multi-phase
agent plans. Agent Sandbox is a better fit because agent workloads are
long-running, stateful, and benefit from warm pools — characteristics
that align with Sandbox semantics rather than batch job semantics.
Tekton remains an option for users who prefer pipeline-based
orchestration.

### Flat phase list without stages

We considered a flat list of phases where consecutive phases sharing
the same Agent implicitly share a Sandbox. Explicit stages make the
context boundaries visible in the plan definition and give architects
direct control over which phases share an execution environment.

## Consequences

- **Dependency on Agent Sandbox:** The project depends on a SIG Apps
  project that is still maturing. If Agent Sandbox changes
  significantly we will need to adapt. Mitigation: Agent Sandbox is
  built on standard pod primitives; fallback to bare pods is
  straightforward.
- **Dependency on skillimage:** skillimage is v0.1.0 with a single
  contributor. We mitigate by contributing directly and shaping the
  project's direction. Red Hat OCTO backing reduces risk.
- **ImageVolume requirement:** K8s 1.33+ or OpenShift 4.20+ required
  for ImageVolume support. Older clusters would need an init container
  fallback that pulls OCI artifacts at startup.
- **Hub remains required for migration use case:** While the CRDs are
  domain-agnostic, the migration skill needs analysis data from Hub.
  Hub is a runtime data dependency, not an infrastructure dependency.
- **K8s API proxy in UI:** The UI server needs a new proxy route to
  the K8s API. Local development requires either a remote cluster
  (via kubeconfig) or mock data.
- **No Hub backend changes needed:** The CRDs eliminate the need for
  Hub API endpoints, database tables, and Go models for these
  resources. This significantly reduces the implementation scope.
