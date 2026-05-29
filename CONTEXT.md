# Konveyor Agentic Platform — Domain Glossary

## Core Resources

**AgentSkill** — An on-demand capability that an Agent can invoke when
relevant to the task at hand. Packaged as an OCI artifact via skillimage
and referenced by its OCI image ref. Follows the Agent Skills open
standard (SKILL.md with YAML frontmatter). Only the skill's name and
description are loaded at agent startup; the full content is activated
on demand. Examples: "maven-migration", "ejb-to-cdi",
"java-ee-to-quarkus".

**AgentRule** — A behavioral constraint that is always loaded into an
Agent's context. Shapes every action the agent takes. Counts toward the
LLM's context budget. Can be packaged as an OCI artifact (with
`type: rule` in frontmatter) or defined inline. Examples:
"no-javax-imports", "use-jakarta-namespace", "commit-message-format".

**LLMProvider** — An LLM service endpoint together with credentials and
the set of models it serves. Each model declares its context window size
and an optional tier label (e.g. premium, efficient). The context window
is used to validate that an Agent's always-loaded rules fit within
budget before execution begins.

**Agent** — The composable execution unit. Binds a set of AgentSkills,
AgentRules, an LLMProvider (with a selected model), a container image
(carrying the agent runtime and language toolchains), and a persona
prompt. Reconciles to an Agent Sandbox SandboxTemplate. An Agent may
reference other Agents as subagents; subagent delegation is handled
within the agent runtime (e.g. goose sub-recipes, opencode task tool).

**AgentPlan** — A high-level guide combined with an ordered sequence of
phases. Each phase references an Agent. Phases map to Agent Sandbox
SandboxClaims. Within a phase the agent runtime handles internal
delegation (shared context). Between phases a shared workspace carries
the repository and handoff documents to bridge context.

## Infrastructure

**skillimage** — Red Hat Emerging Technologies project
(redhat-et/skillimage) providing OCI-based packaging and distribution
for agent skills and rules. The `skillctl` CLI builds skill directories
into OCI images, pushes them to registries, and can install them locally
for development. Skills mount into Kubernetes pods as read-only
ImageVolumes.

**Agent Sandbox** — Kubernetes SIG Apps project
(kubernetes-sigs/agent-sandbox) providing CRDs for isolated, stateful
agent workloads: Sandbox, SandboxTemplate, SandboxClaim, and
SandboxWarmPool. Handles pod lifecycle, stable identity, network
isolation, and warm pool pre-allocation.

**Hub** — The Konveyor application inventory and analysis engine. In the
agentic platform Hub serves as a data service: agents call its API at
runtime to fetch analysis results, application metadata, and git
credentials. Hub does not launch or manage agent workloads.

**pallet** — Skill and rule sync engine. In the agentic platform its
role shifts: agent-native placement logic (adapters for goose, opencode,
cursor, claude code) and governance model (governed/federated hierarchy)
are contributed upstream to skillimage. Pallet remains useful for local
development workflows outside Kubernetes.

## Relationships

- An **Agent** references zero or more **AgentSkills** and **AgentRules**.
- An **Agent** references exactly one **LLMProvider** and selects a model from it.
- An **Agent** may reference other **Agents** as subagents.
- An **AgentPlan** references one **Agent** per phase.
- **AgentSkills** and **AgentRules** reference OCI artifacts published via **skillimage**.
- The controller reconciles an **Agent** into an **Agent Sandbox** SandboxTemplate.
- The controller reconciles an **AgentPlan** phase into an **Agent Sandbox** SandboxClaim.
