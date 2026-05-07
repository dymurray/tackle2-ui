import axios from "axios";

import { AgentConfig, New } from "../models";
import { hub } from "../rest";

const AGENTS = hub`/agents`;

// In-memory store for local dev when Hub API doesn't have /agents yet
let localStore: AgentConfig[] = [];
let nextId = 1;
const USE_LOCAL_FALLBACK = true;

export const getAgents = async (): Promise<AgentConfig[]> => {
  if (USE_LOCAL_FALLBACK) return [...localStore];
  return axios.get<AgentConfig[]>(AGENTS).then(({ data }) => data);
};

export const getAgentById = async (
  id: number | string
): Promise<AgentConfig | undefined> => {
  if (USE_LOCAL_FALLBACK) return localStore.find((a) => a.id === Number(id));
  return axios.get<AgentConfig>(`${AGENTS}/${id}`).then(({ data }) => data);
};

export const createAgent = async (
  agent: New<AgentConfig>
): Promise<AgentConfig> => {
  if (USE_LOCAL_FALLBACK) {
    const created: AgentConfig = {
      ...agent,
      id: nextId++,
    } as AgentConfig;
    localStore.push(created);
    return created;
  }
  return axios.post<AgentConfig>(AGENTS, agent).then((res) => res.data);
};

export const updateAgent = async (agent: AgentConfig): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    const idx = localStore.findIndex((a) => a.id === agent.id);
    if (idx !== -1) localStore[idx] = { ...agent };
    return;
  }
  await axios.put<void>(`${AGENTS}/${agent.id}`, agent);
};

export const deleteAgent = async (id: number): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    localStore = localStore.filter((a) => a.id !== id);
    return;
  }
  await axios.delete<void>(`${AGENTS}/${id}`);
};
