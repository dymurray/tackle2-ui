import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import { AgentRecipe } from "@app/api/models";
import {
  createAgentRecipe,
  deleteAgentRecipe,
  getAgentRecipeById,
  getAgentRecipes,
  updateAgentRecipe,
} from "@app/api/rest";

export const AGENT_RECIPES_QUERY_KEY = "agentRecipes";
export const AGENT_RECIPE_QUERY_KEY = "agentRecipe";

export const useFetchAgentRecipes = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [AGENT_RECIPES_QUERY_KEY],
    queryFn: getAgentRecipes,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    agentRecipes: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchAgentRecipeById = (id?: number | string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [AGENT_RECIPE_QUERY_KEY, id],
    queryFn: () =>
      id === undefined ? Promise.resolve(undefined) : getAgentRecipeById(id),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: id !== undefined,
  });

  return {
    agentRecipe: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateAgentRecipeMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgentRecipe,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: [AGENT_RECIPES_QUERY_KEY] });
    },
    onError: onError,
  });
};

export const useUpdateAgentRecipeMutation = (
  onSuccess: (id: number) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgentRecipe,
    onSuccess: (_, { id }) => {
      onSuccess(id);
      queryClient.invalidateQueries({ queryKey: [AGENT_RECIPES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AGENT_RECIPE_QUERY_KEY, id] });
    },
    onError: onError,
  });
};

export const useDeleteAgentRecipeMutation = (
  onSuccess: (recipe: AgentRecipe) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipe: AgentRecipe) => deleteAgentRecipe(recipe.id),
    onSuccess: (_, recipe) => {
      onSuccess(recipe);
      queryClient.invalidateQueries({ queryKey: [AGENT_RECIPES_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [AGENT_RECIPE_QUERY_KEY, recipe.id],
      });
    },
    onError: onError,
  });
};
