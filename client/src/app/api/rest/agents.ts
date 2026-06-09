import type { Agent } from "../k8s-models";
import {
  listResource,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} from "../k8s";

const PLURAL = "agents";

export const getAgents = (): Promise<Agent[]> =>
  listResource<Agent>(PLURAL);

export const getAgent = (name: string): Promise<Agent> =>
  getResource<Agent>(PLURAL, name);

export const createAgent = (
  resource: Omit<Agent, "status">
): Promise<Agent> => createResource<Agent>(PLURAL, resource);

export const updateAgent = (resource: Agent): Promise<Agent> =>
  updateResource<Agent>(PLURAL, resource);

export const deleteAgent = (name: string): Promise<void> =>
  deleteResource(PLURAL, name);
