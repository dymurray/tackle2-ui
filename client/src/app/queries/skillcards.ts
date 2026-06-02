import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import type { SkillCard } from "@app/api/k8s-models";
import {
  createSkillCard,
  deleteSkillCard,
  getSkillCard,
  getSkillCards,
  updateSkillCard,
} from "@app/api/rest";

export const SKILLCARDS_QUERY_KEY = "skillCards";
export const SKILLCARD_QUERY_KEY = "skillCard";

export const useFetchSkillCards = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [SKILLCARDS_QUERY_KEY],
    queryFn: getSkillCards,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    skillCards: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchSkillCardByName = (name?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [SKILLCARD_QUERY_KEY, name],
    queryFn: () =>
      name === undefined ? Promise.resolve(undefined) : getSkillCard(name),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: name !== undefined,
  });

  return {
    skillCard: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateSkillCardMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSkillCard,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: [SKILLCARDS_QUERY_KEY] });
    },
    onError: onError,
  });
};

export const useUpdateSkillCardMutation = (
  onSuccess: (name: string) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSkillCard,
    onSuccess: (result) => {
      const name = result.metadata.name;
      onSuccess(name);
      queryClient.invalidateQueries({ queryKey: [SKILLCARDS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SKILLCARD_QUERY_KEY, name] });
    },
    onError: onError,
  });
};

export const useDeleteSkillCardMutation = (
  onSuccess: (sc: SkillCard) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sc: SkillCard) => deleteSkillCard(sc.metadata.name),
    onSuccess: (_, sc) => {
      onSuccess(sc);
      queryClient.invalidateQueries({ queryKey: [SKILLCARDS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [SKILLCARD_QUERY_KEY, sc.metadata.name],
      });
    },
    onError: onError,
  });
};
