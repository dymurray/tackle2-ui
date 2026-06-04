---
marp: true
theme: konveyor
paginate: true
title: Konveyor Agentic Platform
---

<!-- _class: lead -->

![w:300](konveyor-logo.svg)

# Konveyor Agentic Platform

**Kubernetes-native primitives for agentic workloads**

David Zager
June 2026

---

# The POC worked

- **tackle2-addon-kai:** AI agent in a container clones a repo, fetches analysis from Hub, applies migration skills, pushes a branch
- Proved the model works — but implementation was tightly coupled to Hub internals

**Next step:** Extract portable, reusable primitives we can leverage for the migration use case and beyond

---

# Approach

1. **Kubernetes-native** — CRDs, standard RBAC, GitOps-friendly
2. **Prior art first** — Find existing Kube-native projects solving adjacent problems; adopt rather than invent. More community buy-in = better
3. **Domain-agnostic** — Primitives that work for migration and any future agentic workload
4. **Composable** — Small building blocks that combine into complex workflows

---

# Prior art we're building on

| Project | What it gives us |
|---------|-----------------|
| **skillimage** ([skillimage.dev](https://skillimage.dev)) | OCI-based packaging and distribution for agent skills. SkillCard and SkillCollection YAML formats. `skillctl` CLI. CNCF-aligned OCI artifact model |
| **Agent Sandbox** (kubernetes-sigs) | SIG Apps project for isolated, stateful agent workloads. Sandbox, SandboxTemplate, SandboxWarmPool CRDs. Lifecycle management, warm pools, network isolation |

Both are early-stage with growing community investment — good opportunities to contribute and shape direction.

---

# Five CRDs

| CRD | Source |
|-----|--------|
| **SkillCard** | Kube-native version of skillimage's SkillCard YAML |
| **SkillCollection** | Kube-native version of skillimage's SkillCollection YAML |
| **LLMProvider** | New — no existing Kube-native LLM credential/model manager found |
| **Agent** | New — composable execution unit binding skills + LLM + image |
| **AgentPlan** | New — orchestration playbook with stages and phases |

---

# SkillCard

A single agent capability or behavioral constraint, as a Kubernetes CR.

- Adopts the [skillimage.dev](https://skillimage.dev) SkillCard format — same shape on a developer's laptop and in a cluster
- References an OCI artifact (distributed via any OCI registry)
- `type: skill` (default) — on-demand capability, activated when the agent needs it
- `type: rule` — always-loaded constraint, injected into every agent turn
- Mounted into agent containers via **ImageVolumes** (K8s 1.33+ / OCP 4.20+) — read-only, cached by kubelet, no init container

---

# SkillCollection

A group of related skills, as a Kubernetes CR.

- Adopts the [skillimage.dev](https://skillimage.dev) SkillCollection format
- Sources skills from OCI image references or git repositories
- An Agent references SkillCollections to gain access to sets of related capabilities
- Example: "konveyor-quarkus-skills" — a collection of 15 migration skills from a git repo

---

# LLMProvider

LLM service endpoint, credentials, and model catalog.

- **No existing Kube-native LLM manager found** — building our own for now
- Credentials stored as a Kubernetes Secret reference (not in the CR)
- Each model declares:
  - **Context window size** — so we can track how much of the window we consume with prompts, skills, and rules before execution begins
  - **Tier label** (optional) — e.g. premium, efficient — for cost-aware model selection
- Validates that an Agent's always-loaded rules fit within the selected model's context budget

---

# Agent

The composable execution unit.

- Binds together:
  - **SkillCards** and **SkillCollections** — what the agent can do
  - **LLMProvider** + selected model — the LLM backing the agent
  - **Container image** — the runtime (goose, opencode, etc.) and toolchains
  - **Prompt** — standing instructions for how the agent operates
- May reference other Agents as **subagents** — delegation handled within the runtime, not by Kubernetes orchestration
- Runtime-neutral: any agent runtime that reads skills from the filesystem

---

# AgentPlan

A reusable playbook for multi-phase agentic work.

- **Guide** — high-level context written to the workspace so every agent understands the bigger picture
- **Stages** — context boundaries; each stage gets its own Sandbox
- **Phases** — ordered tasks within a stage, sharing the same Agent and Sandbox

```
AgentPlan
  |-- guide (ambient context file in workspace)
  |-- Stage 1 ---- Agent A
  |     |-- Phase 1 (instructions)
  |     |-- Phase 2 (instructions)    <-- same sandbox, full continuity
  |-- Stage 2 ---- Agent B
        |-- Phase 3 (instructions)    <-- new sandbox, shared workspace PVC
```

Architects define the playbook; developers run it against their applications.

---

# Architecture

```
  Browser
    |
  tackle2-ui (Node.js)
    |-- /hub  --> Hub API (analysis results, app metadata)
    |-- /k8s  --> kubernetes.default.svc (CRD CRUD)

  Agent container (Sandbox)
    |-- calls Hub API at runtime for analysis data
    |-- skills mounted via ImageVolumes
    |-- LLM credentials via Secret env vars
```

- UI proxies CRD operations to the K8s API server
- Hub remains the data service for migration-specific context

---

# Current state

- ADR proposed — PR [dymurray/tackle2-ui#1](https://github.com/dymurray/tackle2-ui/pull/1)
- Domain glossary (CONTEXT.md)
- UI prototype: list, create, edit, delete for all 5 CRDs
- K8s proxy route working in tackle2-ui

PR will influence an upcoming enhancement proposal.

---

# Next steps

- Controller: reconcile CRDs, generate SandboxTemplates
- skillimage integration: ImageVolume generation from OCI refs
- Agent Sandbox integration: stage/phase execution, warm pools
- Context budget validation
- Upstream contributions to skillimage and Agent Sandbox

---

<!-- _class: lead -->

![w:200](konveyor-logo.svg)

# Questions?

**PR:** [dymurray/tackle2-ui#1](https://github.com/dymurray/tackle2-ui/pull/1)
**ADR:** `docs/adr/0001-agentic-platform-crd-architecture.md`
**Glossary:** `CONTEXT.md`
