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

### Seven CRDs

We introduce seven Custom Resource Definitions. The first two adopt
skillimage's existing YAML format as their CRD spec, aligning our
Kubernetes API with the emerging OCI skills ecosystem. The last two
are execution resources inspired by Tekton's Pipeline/PipelineRun
split:

**Definition resources** (templates, inert until executed):

| CRD | Purpose |
|-----|---------|
| **SkillCard** | Individual skill or rule. Adopts skillimage.io/v1alpha1 SkillCard format. A `type: rule` field distinguishes always-loaded constraints from on-demand skills. References an OCI artifact. |
| **SkillCollection** | Group of skills from OCI image refs or git sources. Adopts skillimage.io/v1alpha1 SkillCollection format. |
| **LLMProvider** | LLM service endpoint, credentials (Secret ref), and available models with context window sizes and optional tier labels. |
| **Agent** | Binds SkillCards + SkillCollections + LLMProvider + container image + prompt + optional memory service. References skills both individually and via collections. |
| **AgentPlan** | High-level guide with ordered stages. Each stage groups phases that share session continuity. Each phase references an Agent and carries markdown instructions. |

**Execution resources** (created to trigger work):

| CRD | Purpose |
|-----|---------|
| **AgentRun** | Executes a single Agent against an application. References an Agent (or inlines the spec), carries instructions and application-specific parameters. Controller creates a Sandbox and tracks status. |
| **AgentPlanRun** | Executes an AgentPlan. References an AgentPlan (or inlines the spec) with application-specific parameters. Controller orchestrates phase-by-phase execution, manages PVCs, passes session IDs, and tracks per-phase status. |

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
design — each Sandbox is one pod with one container image. Each phase
in an AgentPlan runs as its own Sandbox:

- **Phase → Sandbox:** Each phase generates a Sandbox with
  ImageVolumes for its Agent's skills/rules, Secret env vars for LLM
  credentials, and the Agent's container image.
- **Session PVC:** All phases within a stage mount a shared PVC
  containing the agent runtime's session state (SQLite database).
  Each phase resumes the session from the previous phase, providing
  full conversation continuity within the stage.
- **Workspace PVC:** All phases across all stages mount a shared
  workspace PVC containing the application repository. Cross-stage
  handoff files (e.g. PLAN.md tracking progress) are written here.
- **SandboxWarmPool:** Pre-allocated agent pods for running migrations
  at fleet scale.

### AgentPlan execution model

Each phase is an independently-executed Sandbox that references its
own Agent. Phases within a stage can use different Agents (different
skills, different prompts) while maintaining session continuity — the
constraint is that all Agents within a stage must share the same
runtime (e.g. all goose or all opencode) so session resumption works.

An AgentPlan's guide is written to the shared workspace as a context
file before any phase starts. Each phase's instructions are joined
with its Agent's prompt at execution time:

1. Plan Guide → workspace context file (ambient awareness)
2. Agent Prompt → standing instructions (how the agent operates)
3. Phase Instructions → specific task (what to do now)

**Within a stage:** Phases execute sequentially. Each phase runs in
its own Sandbox but resumes the agent session from the previous phase
via the session PVC. The agent retains full conversation history —
it remembers what it did in prior phases. Different phases can bring
different skills, enabling tool reconfiguration between steps.

**Across stages:** A new stage starts with fresh agent context (no
session continuity). Cross-stage knowledge transfer happens through
two mechanisms:

1. **Handoff files** on the workspace PVC — each stage updates
   structured documents (e.g. PLAN.md, CONTEXT.md) recording what
   was accomplished and what remains. The next stage's agent reads
   these as part of its initial context.
2. **Per-agent memory service** — each Agent optionally has a
   persistent, queryable knowledge base (accessible via MCP) that
   accumulates domain knowledge across executions. When the same
   Agent appears in a later stage, it queries its memory for
   relevant patterns and decisions.

### Session resumption via PVC

Both supported agent runtimes store session state in SQLite databases
whose location can be controlled via environment variables:

- **Goose:** `GOOSE_PATH_ROOT` redirects all state (including
  `sessions.db`) to a configurable root. Resume via
  `goose run --resume --session-id <ID>`.
- **Opencode:** `OPENCODE_DB` controls the database path. Resume via
  `opencode run --session <ID>`.

The orchestrator sets these environment variables to point at the
session PVC mount. After each phase completes, the session ID is
captured. The next phase's Sandbox mounts the same PVC and resumes
the session. Sequential access is guaranteed by phase ordering —
SQLite does not support concurrent writers.

### Per-agent memory service

An Agent may reference a memory service — a persistent MCP server
that stores structured domain knowledge (patterns, pitfalls, API
mappings, diary entries). The agent reads from memory at session start
and writes discoveries at session end. Memory accumulates across all
executions of that Agent, enabling organizational learning.

The POC uses mempalace (deployed as a sidecar service with its own
PVC) exposed to goose via `--with-streamable-http-extension`. The
memory service is owned by the Agent, not the plan — the same Agent
in different plans shares the same accumulated knowledge.

### Hub as a data service

Hub is not the workload launcher. The agent container calls Hub's API
at runtime for:

- Analysis results (`GET /hub/applications/{id}/analysis/issues`)
- Application metadata and git credentials

These are passed as environment variables (`HUB_BASE_URL`, `HUB_TOKEN`,
`APP_ID`) set on the Sandbox by the UI or controller.

### Subagent delegation is a runtime concern

Modern agent runtimes (goose, opencode, Claude Code) all support
in-process subagent delegation with isolated context, scoped tools, and
per-subagent model selection. Subagent delegation is handled entirely
by the runtime inside the container — it is not modeled in the CRDs.
The runtime has access to all skills mounted in the Sandbox and can
spawn subagents as it sees fit.

### Context budget validation

SkillCards with `type: rule` are always-loaded and LLMProvider models
declare context window sizes. The system can validate that an Agent's
total rule content fits within the selected model's context window,
preventing runtime failures from context overflow.

### Agent container image strategy

The Agent CRD's `containerImage` field determines the execution
environment — agent runtime, language toolchains, and Konveyor tools.
Skills provide knowledge (what to do); the image provides capability
(what you can do it with). This separation eliminates the need for
skills to declare system-level tool dependencies.

#### Layered image architecture

Three layers, inspired by the Ansible Playbook Bundle (APB) pattern:

**Layer 1 — Base image** (`quay.io/konveyor/agent-base`):

- UBI 10
- Agent runtimes (goose, opencode)
- Konveyor tools (`fetch-analysis`, `run-analysis`)
- Core skills baked into `/opt/skills/`
- git, ssh, basics
- Entrypoint that discovers skills (from ImageVolumes and `/opt/skills/`),
  configures the agent runtime, injects credentials, and starts the
  agent session

This is the Konveyor product layer. Everything here is maintained by
the project.

**Layer 2 — Language images** (e.g., `quay.io/konveyor/agent-java`):

- Extends base
- Includes all supported SDK versions for the language ecosystem
  (e.g., JDK 8, 11, 17, 21 + Maven + Gradle in a single image)
- The agent selects the appropriate version at runtime based on the
  target application's build configuration

Multiple SDK versions in a single image avoids a matrix of
per-version images. Image size is acceptable for agent workloads —
these are long-running Sandbox pods, often pre-pulled via
SandboxWarmPool, not ephemeral microservice containers.

**Layer 3 — Custom images** (built by users):

- Extends a language image
- Adds corporate-specific dependencies: proprietary JDBC drivers,
  internal CA certificates, custom build plugins, licensed libraries
- Built by user CI pipelines, pushed to internal registries

```dockerfile
FROM quay.io/konveyor/agent-java:latest
COPY oracle-jdbc-driver.jar /opt/libs/
COPY internal-ca-bundle.pem /etc/pki/ca-trust/source/anchors/
RUN update-ca-trust
```

#### Self-describing images via labels

Following the APB pattern where `apb.yml` was base64-encoded into a
Docker label (`com.redhat.apb.spec`), agent images carry a
machine-readable declaration of their capabilities:

```dockerfile
LABEL "io.konveyor.agent.spec"="<base64-encoded YAML>"
```

Decoded, the label contains:

```yaml
runtime: goose
runtimeVersion: "1.23"
provides:
  - java-8
  - java-11
  - java-17
  - java-21
  - mvn
  - gradle
  - git
  - fetch-analysis
  - run-analysis
```

The controller can read this label from the registry (inspecting the
image manifest without pulling the image) to surface available
capabilities in the UI and optionally validate compatibility with
referenced skills.

#### Air-gap and network-restricted support

Everything must be in the image at build time. Agent containers
cannot download tools or dependencies at runtime — many enterprise
environments are network-restricted or fully air-gapped. This rules
out runtime tool managers (sdkman, nvm, pyenv) as a general solution.

Skills packaged as OCI artifacts are mirrored to internal registries
using standard tooling (oc-mirror, skopeo) and mounted via
ImageVolumes from the internal registry.

#### Old Java versions in containers

The agent's use case is building and testing code, not running
production workloads. JDK container-awareness issues (cgroup memory
detection, thread pool sizing) affect long-running Java processes but
not short-lived build tools like `javac` and `mvn compile`. JDK 6
through 21 all compile code correctly in containers. JDK 8u192+ and
JDK 11+ have full cgroup awareness. Older JDKs work for builds but
would need explicit `-Xmx` flags if tests exercise memory-sensitive
code paths.

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

We considered a flat list of phases where session continuity is
implicit (consecutive phases with compatible runtimes share a
session) and context breaks happen automatically when the runtime
changes. Explicit stages make session continuity boundaries visible
in the plan definition, give architects direct control over where
fresh context starts, and define the handoff points where progress
documents are written. Stages also allow intentional context breaks
with the same agent — useful when context windows fill up during
long migration sessions.

### Skill-declared tool dependencies

We considered having skills declare their system-level tool
requirements (e.g., `requires: [java, mvn, git]`) and validating at
Agent composition time that the container image satisfies them. The
agentskills.io spec has a `compatibility` field (free text, max 500
chars, experimental) but nothing machine-readable for this purpose.
skillimage's schema adds `spec.dependencies` but only for
skill-to-skill dependencies. The agentoperations/agent-registry
project defines a `SkillBOM.toolRequirements` concept but the
project is inactive (2 stars, last pushed Feb 2026).

We decided against this approach because:

- No existing spec or ecosystem project solves this problem — we
  would be inventing a dependency declaration and resolution system.
- The agentskills.io spec is intentionally lightweight and used by
  30+ clients. A `requires` field would need broad ecosystem buy-in.
- Skills provide knowledge (instructions), not executables. The
  container image is the natural place to guarantee tool
  availability.
- The image-as-contract approach (layered images with self-describing
  labels) eliminates the compatibility surface without spec changes.

A `requires` field may be worth proposing to the agentskills.io
community as the containerized agent use case grows, but it is not
needed for our architecture.

### Runtime tool installation via tool managers

We considered shipping tool managers (sdkman, nvm, pyenv) in the
base image and having the agent install the correct tool versions at
runtime based on the target application's build configuration. This
would avoid per-version images entirely.

Rejected because enterprise environments are frequently
network-restricted or air-gapped. Runtime downloads are not possible
in these environments. All tools must be pre-baked into the image at
build time. Including all supported versions of a language SDK in a
single image (e.g., JDK 8/11/17/21) achieves the same flexibility
without runtime network access.

### Per-version language images

We considered publishing separate images for each language version
(e.g., `agent-java:8`, `agent-java:11`, `agent-java:17`,
`agent-java:21`). This creates a matrix of images to maintain and
forces users to know which JDK version the target application
requires before selecting an agent — information that is often
unknown until the agent inspects the project.

A single language image with all supported versions (selected at
runtime via `JAVA_HOME`) is simpler to maintain, simpler to
document, and handles the common migration scenario where the agent
needs both the source JDK (e.g., 8) and target JDK (e.g., 21)
during the same session.

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
- **Orchestrator required:** The AgentPlan execution model (creating
  Sandboxes per phase, passing session IDs, managing PVCs, capturing
  handoff state) requires a controller or orchestrator. Agent Sandbox
  provides the execution primitive but not the sequencing logic.
- **Single runtime assumption:** The initial implementation assumes
  goose as the agent runtime. The session resumption mechanism is
  runtime-specific (goose's SQLite session DB). Supporting additional
  runtimes (opencode, Claude Code) would require abstracting session
  persistence and ensuring runtime homogeneity within stages.
- **Image maintenance burden:** The project must maintain and publish
  base and language-specific agent images. Each language image
  bundles multiple SDK versions, increasing image size (the Java
  image with JDK 8/11/17/21 + Maven + Gradle adds ~1.2 GB to the
  base). This is acceptable for long-running Sandbox pods with warm
  pool pre-pulling but would not be appropriate for ephemeral
  containers.
- **Users own corporate extensions:** Organizations with proprietary
  dependencies (licensed libraries, internal CAs, custom tools) must
  build and maintain their own agent images extending the published
  language images. Good documentation and simple base images reduce
  this burden, following the APB pattern.
- **No skill-to-image compatibility validation (by design):** Skills
  do not declare tool dependencies. An architect who attaches a
  Maven skill to a Python agent image will discover the mismatch at
  runtime, not at composition time. The self-describing image label
  mitigates this by surfacing image capabilities in the UI, but
  automated validation is not enforced. Convention and curated images
  are the primary guardrails.
