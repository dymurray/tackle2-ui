import axios from "axios";

import { AgentConfig, AgentModelConfig, New } from "../models";
import { hub } from "../rest";

const AGENTS = hub`/agents`;

// Hub returns recipes as full {id, name} refs; on POST/PUT it only needs the id.
type RecipeRef = { id: number; name?: string };

type AgentWire = Omit<AgentConfig, "recipeIds"> & {
  recipes?: RecipeRef[];
  modelConfig?: AgentModelConfig;
};

const toClient = (w: AgentWire): AgentConfig => {
  const { recipes, ...rest } = w;
  return {
    ...rest,
    recipeIds: recipes?.map((r) => r.id) ?? [],
  };
};

const toServer = (a: AgentConfig | New<AgentConfig>): AgentWire => {
  const { recipeIds, ...rest } = a as AgentConfig;
  return {
    ...rest,
    recipes: (recipeIds ?? []).map((id) => ({ id })),
  };
};

export const getAgents = (): Promise<AgentConfig[]> =>
  axios.get<AgentWire[]>(AGENTS).then(({ data }) => data.map(toClient));

export const getAgentById = (id: number | string): Promise<AgentConfig> =>
  axios.get<AgentWire>(`${AGENTS}/${id}`).then(({ data }) => toClient(data));

export const createAgent = (agent: New<AgentConfig>): Promise<AgentConfig> =>
  axios
    .post<AgentWire>(AGENTS, toServer(agent))
    .then(({ data }) => toClient(data));

export const updateAgent = (agent: AgentConfig): Promise<void> =>
  axios
    .put<void>(`${AGENTS}/${agent.id}`, toServer(agent))
    .then(() => undefined);

export const deleteAgent = (id: number): Promise<void> =>
  axios.delete<void>(`${AGENTS}/${id}`).then(() => undefined);
