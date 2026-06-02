// Kubernetes resource types for the Agentic Platform CRDs (konveyor.io/v1alpha1)

export interface K8sObjectMeta {
  name: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface K8sResource<
  Spec = unknown,
  Status = unknown,
> {
  apiVersion: string;
  kind: string;
  metadata: K8sObjectMeta;
  spec: Spec;
  status?: Status;
}

export interface K8sResourceList<T> {
  apiVersion: string;
  kind: string;
  metadata: { resourceVersion?: string };
  items: T[];
}

// --- SkillCard ---

export interface SkillCardSpec {
  type?: "skill" | "rule";
  description: string;
  image?: string;
  content?: string;
  version?: string;
  tags?: string[];
  globs?: string[];
  governance?: {
    license?: string;
    owner?: string;
  };
}

export interface SkillCardStatus {
  image?: string;
  contentSize?: number;
  ready?: boolean;
}

export type SkillCard = K8sResource<SkillCardSpec, SkillCardStatus>;
export type SkillCardList = K8sResourceList<SkillCard>;

// --- SkillCollection ---

export interface SkillCollectionSkillEntry {
  name: string;
  image?: string;
  source?: string;
  ref?: string;
}

export interface SkillCollectionSpec {
  description: string;
  skills: SkillCollectionSkillEntry[];
}

export interface SkillCollectionStatus {
  skillCount?: number;
  ready?: boolean;
}

export type SkillCollection = K8sResource<
  SkillCollectionSpec,
  SkillCollectionStatus
>;
export type SkillCollectionList = K8sResourceList<SkillCollection>;

// --- LLMProvider ---

export interface LLMProviderModel {
  name: string;
  contextWindow?: number;
  tier?: string;
}

export interface LLMProviderSpec {
  description: string;
  url: string;
  credentialsSecretRef?: {
    name: string;
    key?: string;
  };
  provider?: string;
  models?: LLMProviderModel[];
}

export interface LLMProviderStatus {
  ready?: boolean;
}

export type LLMProvider = K8sResource<LLMProviderSpec, LLMProviderStatus>;
export type LLMProviderList = K8sResourceList<LLMProvider>;

// --- Agent ---

export interface AgentSpec {
  description: string;
  prompt?: string;
  containerImage?: string;
  llmProviderRef?: { name: string };
  model?: string;
  skillCardRefs?: { name: string }[];
  skillCollectionRefs?: { name: string }[];
  subagentRefs?: { name: string }[];
}

export interface AgentStatus {
  ready?: boolean;
  ruleContentSize?: number;
  contextBudgetOk?: boolean;
}

export type Agent = K8sResource<AgentSpec, AgentStatus>;
export type AgentList = K8sResourceList<Agent>;

// --- AgentPlan ---

export interface AgentPlanPhase {
  name: string;
  description?: string;
  instructions: string;
}

export interface AgentPlanStage {
  name: string;
  description?: string;
  agentRef: { name: string };
  phases: AgentPlanPhase[];
}

export interface AgentPlanSpec {
  description: string;
  guide?: string;
  stages?: AgentPlanStage[];
}

export interface AgentPlanStatus {
  ready?: boolean;
  stageCount?: number;
  phaseCount?: number;
}

export type AgentPlan = K8sResource<AgentPlanSpec, AgentPlanStatus>;
export type AgentPlanList = K8sResourceList<AgentPlan>;
