import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import type { SkillCollection } from "@app/api/k8s-models";
import {
  createSkillCollection,
  deleteSkillCollection,
  getSkillCollection,
  getSkillCollections,
  updateSkillCollection,
} from "@app/api/rest";

export const SKILLCOLLECTIONS_QUERY_KEY = "skillCollections";
export const SKILLCOLLECTION_QUERY_KEY = "skillCollection";

export const useFetchSkillCollections = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [SKILLCOLLECTIONS_QUERY_KEY],
    queryFn: getSkillCollections,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    skillCollections: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchSkillCollectionByName = (name?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [SKILLCOLLECTION_QUERY_KEY, name],
    queryFn: () =>
      name === undefined
        ? Promise.resolve(undefined)
        : getSkillCollection(name),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: name !== undefined,
  });

  return {
    skillCollection: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateSkillCollectionMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSkillCollection,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: [SKILLCOLLECTIONS_QUERY_KEY],
      });
    },
    onError: onError,
  });
};

export const useUpdateSkillCollectionMutation = (
  onSuccess: (name: string) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSkillCollection,
    onSuccess: (result) => {
      const name = result.metadata.name;
      onSuccess(name);
      queryClient.invalidateQueries({
        queryKey: [SKILLCOLLECTIONS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [SKILLCOLLECTION_QUERY_KEY, name],
      });
    },
    onError: onError,
  });
};

export const useDeleteSkillCollectionMutation = (
  onSuccess: (sc: SkillCollection) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sc: SkillCollection) =>
      deleteSkillCollection(sc.metadata.name),
    onSuccess: (_, sc) => {
      onSuccess(sc);
      queryClient.invalidateQueries({
        queryKey: [SKILLCOLLECTIONS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [SKILLCOLLECTION_QUERY_KEY, sc.metadata.name],
      });
    },
    onError: onError,
  });
};
