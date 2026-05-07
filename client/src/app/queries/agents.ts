import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import { AgentConfig } from "@app/api/models";
import {
  createAgent,
  deleteAgent,
  getAgentById,
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

export const useFetchAgentById = (id?: number | string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [AGENT_QUERY_KEY, id],
    queryFn: () =>
      id === undefined ? Promise.resolve(undefined) : getAgentById(id),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: id !== undefined,
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
  onSuccess: (id: number) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
    onSuccess: (_, { id }) => {
      onSuccess(id);
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AGENT_QUERY_KEY, id] });
    },
    onError: onError,
  });
};

export const useDeleteAgentMutation = (
  onSuccess: (agent: AgentConfig) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agent: AgentConfig) => deleteAgent(agent.id),
    onSuccess: (_, agent) => {
      onSuccess(agent);
      queryClient.invalidateQueries({ queryKey: [AGENTS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [AGENT_QUERY_KEY, agent.id],
      });
    },
    onError: onError,
  });
};
