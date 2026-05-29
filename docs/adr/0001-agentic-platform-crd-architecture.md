# ADR 0001: Agentic Platform CRD Architecture

**Status:** Proposed
**Date:** 2026-05-29
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
2. Leverage emerging Kubernetes-native infrastructure for agent
   execution (Agent Sandbox) and skill distribution (skillimage) rather
   than building bespoke equivalents.
3. Keep Hub as a valuable data service (analysis results, app metadata)
   without requiring it as the workload launcher.
4. Support multiple agent runtimes (goose, opencode, and future
   options) without baking runtime-specific concepts into the CRDs.

## Decision

### Five CRDs

We introduce five Custom Resource Definitions under a Konveyor API
group:

| CRD | Purpose |
|-----|---------|
| **AgentSkill** | On-demand capability. References an OCI artifact containing a skill (SKILL.md + scripts + references). |
| **AgentRule** | Always-loaded behavioral constraint. References an OCI artifact or carries inline markdown content. |
| **LLMProvider** | LLM service endpoint, credentials (Secret ref), and available models with context window sizes and optional tier labels. |
| **Agent** | Binds AgentSkills + AgentRules + LLMProvider + container image + persona prompt. Reconciles to an Agent Sandbox SandboxTemplate. |
| **AgentPlan** | High-level guide with ordered phases, each referencing an Agent. Phases reconcile to Agent Sandbox SandboxClaims. |

### Skill and rule packaging via skillimage

Skills and rules are packaged as OCI artifacts using
redhat-et/skillimage (`skillctl build`, `skillctl push`). This gives us:

- Distribution through any OCI registry (Quay, Harbor, GHCR).
- Supply chain security (cosign signing, SLSA provenance, SBOMs).
- Kubernetes-native mounting via ImageVolumes (K8s 1.33+ / OpenShift
  4.20+) — read-only, cached by kubelet, no init container.
- A local development story (`skillctl install`) using the same
  artifacts.

Pallet's agent-native placement logic and governance model are
contributed upstream to skillimage rather than maintained as a separate
tool.

### Execution via Agent Sandbox

Agent workloads run as Agent Sandbox resources
(kubernetes-sigs/agent-sandbox):

- **Agent → SandboxTemplate:** The controller generates a pod template
  with ImageVolumes for skills/rules, Secret env vars for LLM
  credentials, and the agent's container image.
- **AgentPlan phase → SandboxClaim:** Each phase creates a claim
  against the template with app-specific parameters (repo URL, app ID,
  Hub URL).
- **SandboxWarmPool:** Pre-allocated agent pods for running migrations
  at fleet scale.

### Hub as a data service

Hub is not the workload launcher. The agent container calls Hub's API at
runtime for:

- Analysis results (`GET /hub/applications/{id}/analysis/issues`)
- Application metadata and git credentials

These are passed as environment variables (`HUB_BASE_URL`, `HUB_TOKEN`,
`APP_ID`) set on the SandboxClaim by the controller or UI.

### Subagent delegation is runtime-internal

Modern agent runtimes (goose, opencode, Claude Code) all support
in-process subagent delegation with isolated context, scoped tools, and
per-subagent model selection. The Agent CRD may reference other Agent
CRDs as subagents, but the delegation mechanics are handled by the
runtime inside the container — not by Kubernetes-level orchestration.

### Context budget validation

Because AgentRules are always-loaded and LLMProvider models declare
context window sizes, the controller can validate at admission time that
an Agent's total rule content fits within the selected model's context
window. This prevents runtime failures from context overflow.

## Alternatives Considered

### Hub API resources instead of CRDs

The existing dymurray/agent branch defines AgentRecipe, AgentPlan, and
Agent as Hub API resources (`/hub/agents`, `/hub/agent-recipes`,
`/hub/agent-plans`). This couples the resources to Hub's lifecycle and
API surface. CRDs are portable, work with standard Kubernetes tooling
(kubectl, GitOps, RBAC), and can be consumed by non-Hub systems.

### pallet as runtime sync engine

The POC runs `pallet sync .` at container startup to fetch skills from
git repos. This adds network dependency and startup latency. OCI
artifacts via skillimage are pre-mounted by kubelet before the container
starts — faster, deterministic, and auditable via image digests.

### Custom pod/job creation instead of Agent Sandbox

We considered having the controller or UI create bare Pods or Jobs
directly. Agent Sandbox provides lifecycle management (hibernation,
warm pools, stable identity, network isolation) that we would otherwise
need to build ourselves.

### Tekton as the execution layer

Tekton Tasks/Pipelines were considered for orchestrating multi-phase
agent plans. Agent Sandbox is a better fit because agent workloads are
long-running, stateful, and benefit from warm pools — characteristics
that align with Sandbox semantics rather than batch job semantics.
Tekton remains an option for users who prefer pipeline-based
orchestration.

### A single Skill CRD with a type field instead of separate AgentSkill and AgentRule

Skills and rules have different activation semantics (on-demand vs
always-loaded), different context budget impact, and different placement
patterns. Separate CRDs make the distinction explicit in the API and
prevent users from accidentally adding an always-loaded rule when they
intended an on-demand skill.

## Consequences

- **Dependency on Agent Sandbox:** The project depends on a SIG Apps
  project that is still maturing. If Agent Sandbox changes
  significantly we will need to adapt. Mitigation: Agent Sandbox is
  built on standard pod primitives; fallback to bare pods is
  straightforward.
- **Dependency on skillimage:** skillimage is v0.1.0 with a single
  contributor. We mitigate by contributing directly and shaping the
  project's direction.
- **ImageVolume requirement:** K8s 1.33+ or OpenShift 4.20+ required
  for ImageVolume support. Older clusters would need an init container
  fallback that pulls OCI artifacts at startup.
- **Hub remains required for migration use case:** While the CRDs are
  domain-agnostic, the migration skill needs analysis data from Hub.
  Hub is a runtime data dependency, not an infrastructure dependency.
- **Controller is the main deliverable:** The five CRDs and their
  reconciliation logic are the primary engineering work for Konveyor.
