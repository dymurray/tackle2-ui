# Agentic Platform CRD Deployment

Kubernetes CRD definitions for the Konveyor Agentic Platform. See
[ADR 0001](../docs/adr/0001-agentic-platform-crd-architecture.md) for
the full architectural decision record and [CONTEXT.md](../CONTEXT.md)
for the domain glossary.

## Quick start

```bash
# Deploy CRDs and RBAC (default namespace: konveyor-tackle)
kubectl apply -k deploy/

# Verify CRDs are installed
kubectl get crds | grep konveyor.io

# Verify resources work
kubectl get skillcards,skillcollections,llmproviders,agents,agentplans -n konveyor-tackle
```

## Override the namespace

The ClusterRoleBinding grants the tackle-ui service account access.
Edit `deploy/rbac/rolebinding.yaml` to change the namespace:

```yaml
subjects:
  - kind: ServiceAccount
    name: tackle-ui
    namespace: my-custom-namespace   # <-- change this
```

## Structure

```
deploy/
  kustomization.yaml   Kustomize entrypoint
  crds/                CRD definitions (5 resources)
    skillcard.yaml       Individual skill or rule
    skillcollection.yaml Group of skills from OCI/git
    llmprovider.yaml     LLM endpoint + credentials + models
    agent.yaml           Composable execution unit
    agentplan.yaml       Playbook with stages and phases
  rbac/                RBAC definitions
    role.yaml            ClusterRole with CRUD on all CRDs
    rolebinding.yaml     Binds role to tackle-ui service account
```

## CRD design notes

### SkillCard: image vs content

A SkillCard can provide its skill/rule content in two ways:

- **image**: An OCI image ref built via `skillctl build`. Mounted into
  agent pods as a read-only ImageVolume (K8s 1.33+).
- **content**: Inline markdown. Mounted via ConfigMap for the initial
  implementation.

Future: a controller will automatically build inline content into OCI
images via skillimage's Go library, pushing to the cluster's registry
(e.g. OpenShift internal registry) and updating `status.image` with
the resolved ref. This unifies the mounting strategy — every skill
becomes an ImageVolume regardless of how it was authored.

### SkillCard: skill vs rule

The `spec.type` field distinguishes activation semantics:

- `skill` (default): On-demand. Name and description loaded at agent
  startup; full content loaded when the agent invokes the skill.
- `rule`: Always-loaded. Full content injected into every agent turn.
  Counts toward the LLM's context budget.

Both use the same SkillCard CRD. The type field determines placement
in the agent runtime's directory structure (e.g. `.goose/skills/` vs
`.goose/memories/`).

### AgentPlan: three layers of instructions

At execution time, three layers compose:

1. **Plan Guide** (`spec.guide`) -> Written to the workspace as a
   context file. Provides ambient awareness of the bigger picture.
2. **Agent Prompt** (`agent.spec.prompt`) -> Standing instructions for
   how the agent operates.
3. **Phase Instructions** (`stage.phases[].instructions`) -> The
   specific task for this execution.

### AgentPlan: stages as context boundaries

Stages group phases that share a context boundary:
- Phases within a stage execute sequentially in the same Sandbox
  (same pod, same agent, full context continuity).
- Stage transitions create a new Sandbox for a different Agent.
- A shared workspace PVC carries repository state and handoff
  documents across stage boundaries.

### Context budget validation

The system can validate that an Agent's total rule content fits within
the selected model's context window:

1. Sum `status.contentSize` of all SkillCards with `type: rule`
   referenced by the Agent (directly or via SkillCollections).
2. Look up `contextWindow` on the selected model in the LLMProvider.
3. If rule content exceeds a threshold (e.g. 80% of context window),
   set `status.contextBudgetOk: false` on the Agent.
