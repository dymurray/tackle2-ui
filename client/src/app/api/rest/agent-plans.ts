import type { AgentPlan } from "../k8s-models";
import {
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../k8s";

const PLURAL = "agentplans";

export const getAgentPlans = (): Promise<AgentPlan[]> =>
  listResource<AgentPlan>(PLURAL);

export const getAgentPlan = (name: string): Promise<AgentPlan> =>
  getResource<AgentPlan>(PLURAL, name);

export const createAgentPlan = (
  resource: Omit<AgentPlan, "status">
): Promise<AgentPlan> => createResource<AgentPlan>(PLURAL, resource);

export const updateAgentPlan = (resource: AgentPlan): Promise<AgentPlan> =>
  updateResource<AgentPlan>(PLURAL, resource);

export const deleteAgentPlan = (name: string): Promise<void> =>
  deleteResource(PLURAL, name);
