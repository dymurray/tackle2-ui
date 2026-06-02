import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import type { Agent } from "@app/api/k8s-models";
import {
  createAgent,
  deleteAgent,
  getAgent,
  getAgents,
  updateAgent,
} from "@app/api/rest";

export const AGENTS_QUERY_KEY = "agents";
export const AGENT_QUERY_KEY = "agent";

export const useFetchAgents = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [AGENTS_QUERY_KEY],
    queryFn: getAgents,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    agents: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchAgentByName = (name?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [AGENT_QUERY_KEY, name],
    queryFn: () =>
      name === undefined ? Promise.resolve(undefined) : getAgent(name),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: name !== undefined,
  });

  return {
    agent: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateAgentMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
    },
    onError: onError,
  });
};

export const useUpdateAgentMutation = (
  onSuccess: (name: string) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
    onSuccess: (result) => {
      const name = result.metadata.name;
      onSuccess(name);
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AGENT_QUERY_KEY, name] });
    },
    onError: onError,
  });
};

export const useDeleteAgentMutation = (
  onSuccess: (agent: Agent) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agent: Agent) => deleteAgent(agent.metadata.name),
    onSuccess: (_, agent) => {
      onSuccess(agent);
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [AGENT_QUERY_KEY, agent.metadata.name],
      });
    },
    onError: onError,
  });
};
