import axios from "axios";

import { AgentPlan, New } from "../models";
import { hub } from "../rest";

const AGENT_PLANS = hub`/agent-plans`;

// In-memory store for local dev when Hub API doesn't have /agent-plans yet
let localStore: AgentPlan[] = [];
let nextId = 1;
const USE_LOCAL_FALLBACK = true;

export const getAgentPlans = async (): Promise<AgentPlan[]> => {
  if (USE_LOCAL_FALLBACK) return [...localStore];
  return axios.get<AgentPlan[]>(AGENT_PLANS).then(({ data }) => data);
};

export const getAgentPlanById = async (
  id: number | string
): Promise<AgentPlan | undefined> => {
  if (USE_LOCAL_FALLBACK) return localStore.find((p) => p.id === Number(id));
  return axios.get<AgentPlan>(`${AGENT_PLANS}/${id}`).then(({ data }) => data);
};

export const createAgentPlan = async (
  plan: New<AgentPlan>
): Promise<AgentPlan> => {
  if (USE_LOCAL_FALLBACK) {
    const created: AgentPlan = {
      ...plan,
      id: nextId++,
    } as AgentPlan;
    localStore.push(created);
    return created;
  }
  return axios.post<AgentPlan>(AGENT_PLANS, plan).then((res) => res.data);
};

export const updateAgentPlan = async (plan: AgentPlan): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    const idx = localStore.findIndex((p) => p.id === plan.id);
    if (idx !== -1) localStore[idx] = { ...plan };
    return;
  }
  await axios.put<void>(`${AGENT_PLANS}/${plan.id}`, plan);
};

export const deleteAgentPlan = async (id: number): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    localStore = localStore.filter((p) => p.id !== id);
    return;
  }
  await axios.delete<void>(`${AGENT_PLANS}/${id}`);
};
