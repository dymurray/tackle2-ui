# Konveyor Agentic Platform — Domain Glossary

## Core Resources

**SkillCard** — An individual agent capability or behavioral constraint,
following the skillimage.io/v1alpha1 SkillCard format. Packaged as an
OCI artifact via skillimage and referenced by its OCI image ref. A
SkillCard with `type: skill` (default) is on-demand — only its name and
description are loaded at startup; the full content activates when the
agent invokes it. A SkillCard with `type: rule` is always-loaded — its
full content is injected into every agent turn and counts toward the
LLM's context budget. Examples: "maven-migration" (skill),
"no-javax-imports" (rule).

**SkillCollection** — A group of skills sourced from OCI image
references or git repositories, following the skillimage.io/v1alpha1
SkillCollection format. An Agent references SkillCollections to gain
access to sets of related capabilities. Examples:
"konveyor-quarkus-skills" (a collection of 15 migration skills from a
git repo), "enterprise-rules" (a curated set of rules as OCI images).

**LLMProvider** — An LLM service endpoint together with credentials and
the set of models it serves. Each model declares its context window
size and an optional tier label (e.g. premium, efficient). The context
window is used to validate that an Agent's always-loaded rules fit
within budget before execution begins.

**Agent** — The composable execution unit. Binds a set of SkillCards
and SkillCollections, an LLMProvider (with a selected model), a
container image (carrying the agent runtime and language toolchains),
a prompt (standing instructions for how the agent operates), and
optionally a memory service for accumulating domain knowledge across
executions. Subagent delegation is a runtime concern — the agent
runtime (e.g. goose sub-recipes) may spawn subagents internally but
this is not modeled in the CRD.

**AgentPlan** — A reusable playbook combining a high-level guide with
an ordered sequence of stages. Each stage groups one or more phases
that share session continuity. Each phase references its own Agent
and is an independently-executed unit of work that runs in its own
Sandbox, resuming the agent session from the previous phase via
shared persistent storage (PVC). Phases within a stage can use
different Agents (different skills, prompts) as long as they share
the same underlying runtime for session resumption. Phase boundaries
provide checkpoints — results can be inspected, a failed phase
retried, or execution stopped early. Stages start with fresh agent
context. Cross-stage continuity comes from the shared workspace PVC:
each stage updates handoff files (e.g. PLAN.md tracking what's done
and what remains) that the next stage's agent reads. The plan's guide
provides ambient context (written as a context file in the workspace)
so each agent understands where its work fits in the bigger picture.
An AgentPlan is a template — creating one does not execute anything.

**AgentRun** — A request to execute a single Agent. References an
Agent (or inlines the spec), carries instructions and generic
parameters (key-value pairs injected as environment variables into
the Sandbox). The controller creates a Sandbox and tracks status to
completion. Parameters are domain-agnostic — the Konveyor UI knows
to populate Hub-specific params (APP_ID, HUB_BASE_URL, etc.) for
migration use cases.

**AgentPlanRun** — A request to execute an AgentPlan. References an
AgentPlan (or inlines the spec) and carries generic parameters. The
controller orchestrates the execution: creates a Sandbox per phase,
manages session and workspace PVCs, passes session IDs between
phases, writes the plan guide, and handles cross-stage handoff.
Tracks per-phase status (pending, running, completed, failed).

## Personas

**Platform Admin** — Creates and manages SkillCards, SkillCollections,
and LLMProviders. Responsible for what capabilities and infrastructure
are available to agents.

**Architect / PM** — Creates Agents and AgentPlans. Defines the
playbook for how migrations (or other agentic work) should be
executed, which agents handle which phases, and what instructions
each phase receives.

**Developer** — Consumes Agents and AgentPlans. Selects an application,
picks an Agent or AgentPlan, runs it, and receives a branch with
results.

## Infrastructure

**skillimage** — Red Hat Emerging Technologies project
(redhat-et/skillimage) providing OCI-based packaging and distribution
for agent skills and rules. The `skillctl` CLI builds, validates,
promotes, pushes, pulls, and installs skills. SkillCard and
SkillCollection are skillimage's YAML metadata formats — our
Kubernetes CRDs adopt the same shape. Supported install targets:
claude, cursor, windsurf, opencode, openclaw.

**Agent Sandbox** — Kubernetes SIG Apps project
(kubernetes-sigs/agent-sandbox) providing CRDs for isolated, stateful
agent workloads: Sandbox, SandboxTemplate, SandboxClaim, and
SandboxWarmPool. Single-container design. Handles pod lifecycle,
stable identity, network isolation, and warm pool pre-allocation.

**OpenShell** — NVIDIA's secure-by-design runtime for autonomous
agents. A policy enforcement and governance layer that runs on top of
Agent Sandbox. Provides kernel-level isolation, declarative YAML-based
security policies, and inference routing. Complementary to Agent
Sandbox, not a replacement.

**Hub** — The Konveyor application inventory and analysis engine. In
the agentic platform Hub serves as a data service: agents call its API
at runtime to fetch analysis results, application metadata, and git
credentials. Hub does not launch or manage agent workloads.

**Memory Service** — A persistent, queryable knowledge base owned by
an Agent, accessible via MCP. The agent reads from it at session
start and writes discoveries at session end. Accumulates domain
knowledge (patterns, pitfalls, API mappings) across executions,
enabling organizational learning. Each Agent has its own memory
service instance.

## Relationships

- An **Agent** references zero or more **SkillCards** and zero or more
  **SkillCollections**.
- An **Agent** references exactly one **LLMProvider** and selects a
  model from it.
- An **AgentPlan** organizes work into stages; each stage contains
  one or more phases. Each phase references an **Agent** and carries
  instructions.
- An **AgentRun** references one **Agent** (or inlines it).
- An **AgentPlanRun** references one **AgentPlan** (or inlines it).
- **SkillCards** and **SkillCollections** reference OCI artifacts
  published via **skillimage**.
- At execution time, the plan's guide is written to the workspace as a
  context file. Each phase's instructions are joined with the Agent's
  prompt to form the full task for the agent runtime.
