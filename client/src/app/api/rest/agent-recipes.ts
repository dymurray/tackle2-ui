import axios from "axios";

import { AgentRecipe, New } from "../models";
import { hub } from "../rest";

const AGENT_RECIPES = hub`/agent-recipes`;

// In-memory store for local dev when Hub API doesn't have /agent-recipes yet
let localStore: AgentRecipe[] = [];
let nextId = 1;
const USE_LOCAL_FALLBACK = true;

export const getAgentRecipes = async (): Promise<AgentRecipe[]> => {
  if (USE_LOCAL_FALLBACK) return [...localStore];
  return axios.get<AgentRecipe[]>(AGENT_RECIPES).then(({ data }) => data);
};

export const getAgentRecipeById = async (
  id: number | string
): Promise<AgentRecipe | undefined> => {
  if (USE_LOCAL_FALLBACK) return localStore.find((r) => r.id === Number(id));
  return axios
    .get<AgentRecipe>(`${AGENT_RECIPES}/${id}`)
    .then(({ data }) => data);
};

export const createAgentRecipe = async (
  recipe: New<AgentRecipe>
): Promise<AgentRecipe> => {
  if (USE_LOCAL_FALLBACK) {
    const created: AgentRecipe = {
      ...recipe,
      id: nextId++,
    } as AgentRecipe;
    localStore.push(created);
    return created;
  }
  return axios.post<AgentRecipe>(AGENT_RECIPES, recipe).then((res) => res.data);
};

export const updateAgentRecipe = async (recipe: AgentRecipe): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    const idx = localStore.findIndex((r) => r.id === recipe.id);
    if (idx !== -1) localStore[idx] = { ...recipe };
    return;
  }
  await axios.put<void>(`${AGENT_RECIPES}/${recipe.id}`, recipe);
};

export const deleteAgentRecipe = async (id: number): Promise<void> => {
  if (USE_LOCAL_FALLBACK) {
    localStore = localStore.filter((r) => r.id !== id);
    return;
  }
  await axios.delete<void>(`${AGENT_RECIPES}/${id}`);
};
