import axios from "axios";

import { AgentRecipe, New } from "../models";
import { hub } from "../rest";

const AGENT_RECIPES = hub`/agent-recipes`;

export const getAgentRecipes = (): Promise<AgentRecipe[]> =>
  axios.get<AgentRecipe[]>(AGENT_RECIPES).then(({ data }) => data);

export const getAgentRecipeById = (id: number | string): Promise<AgentRecipe> =>
  axios.get<AgentRecipe>(`${AGENT_RECIPES}/${id}`).then(({ data }) => data);

export const createAgentRecipe = (
  recipe: New<AgentRecipe>
): Promise<AgentRecipe> =>
  axios.post<AgentRecipe>(AGENT_RECIPES, recipe).then(({ data }) => data);

export const updateAgentRecipe = (recipe: AgentRecipe): Promise<void> =>
  axios
    .put<void>(`${AGENT_RECIPES}/${recipe.id}`, recipe)
    .then(() => undefined);

export const deleteAgentRecipe = (id: number): Promise<void> =>
  axios.delete<void>(`${AGENT_RECIPES}/${id}`).then(() => undefined);
