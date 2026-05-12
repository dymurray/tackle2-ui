import axios from "axios";

import { AgentPlan, New } from "../models";
import { hub } from "../rest";

const AGENT_PLANS = hub`/agent-plans`;

export const getAgentPlans = (): Promise<AgentPlan[]> =>
  axios.get<AgentPlan[]>(AGENT_PLANS).then(({ data }) => data);

export const getAgentPlanById = (id: number | string): Promise<AgentPlan> =>
  axios.get<AgentPlan>(`${AGENT_PLANS}/${id}`).then(({ data }) => data);

export const createAgentPlan = (plan: New<AgentPlan>): Promise<AgentPlan> =>
  axios.post<AgentPlan>(AGENT_PLANS, plan).then(({ data }) => data);

export const updateAgentPlan = (plan: AgentPlan): Promise<void> =>
  axios.put<void>(`${AGENT_PLANS}/${plan.id}`, plan).then(() => undefined);

export const deleteAgentPlan = (id: number): Promise<void> =>
  axios.delete<void>(`${AGENT_PLANS}/${id}`).then(() => undefined);
