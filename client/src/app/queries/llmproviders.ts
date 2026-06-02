import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import type { LLMProvider } from "@app/api/k8s-models";
import {
  createLLMProvider,
  deleteLLMProvider,
  getLLMProvider,
  getLLMProviders,
  updateLLMProvider,
} from "@app/api/rest";

export const LLMPROVIDERS_QUERY_KEY = "llmProviders";
export const LLMPROVIDER_QUERY_KEY = "llmProvider";

export const useFetchLLMProviders = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [LLMPROVIDERS_QUERY_KEY],
    queryFn: getLLMProviders,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    llmProviders: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchLLMProviderByName = (name?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [LLMPROVIDER_QUERY_KEY, name],
    queryFn: () =>
      name === undefined ? Promise.resolve(undefined) : getLLMProvider(name),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: name !== undefined,
  });

  return {
    llmProvider: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateLLMProviderMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLLMProvider,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: [LLMPROVIDERS_QUERY_KEY] });
    },
    onError: onError,
  });
};

export const useUpdateLLMProviderMutation = (
  onSuccess: (name: string) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLLMProvider,
    onSuccess: (result) => {
      const name = result.metadata.name;
      onSuccess(name);
      queryClient.invalidateQueries({ queryKey: [LLMPROVIDERS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [LLMPROVIDER_QUERY_KEY, name],
      });
    },
    onError: onError,
  });
};

export const useDeleteLLMProviderMutation = (
  onSuccess: (p: LLMProvider) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (p: LLMProvider) => deleteLLMProvider(p.metadata.name),
    onSuccess: (_, p) => {
      onSuccess(p);
      queryClient.invalidateQueries({ queryKey: [LLMPROVIDERS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [LLMPROVIDER_QUERY_KEY, p.metadata.name],
      });
    },
    onError: onError,
  });
};
