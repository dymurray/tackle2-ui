import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { DEFAULT_REFETCH_INTERVAL } from "@app/Constants";
import { AgentPlan } from "@app/api/models";
import {
  createAgentPlan,
  deleteAgentPlan,
  getAgentPlanById,
  getAgentPlans,
  updateAgentPlan,
} from "@app/api/rest";

export const AGENT_PLANS_QUERY_KEY = "agentPlans";
export const AGENT_PLAN_QUERY_KEY = "agentPlan";

export const useFetchAgentPlans = (
  refetchInterval: number | false = DEFAULT_REFETCH_INTERVAL
) => {
  const { isLoading, isSuccess, error, refetch, data } = useQuery({
    queryKey: [AGENT_PLANS_QUERY_KEY],
    queryFn: getAgentPlans,
    onError: (error: AxiosError) => console.log(error),
    refetchInterval,
  });

  return {
    agentPlans: data || [],
    isLoading,
    isSuccess,
    fetchError: error,
    refetch,
  };
};

export const useFetchAgentPlanById = (id?: number | string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [AGENT_PLAN_QUERY_KEY, id],
    queryFn: () =>
      id === undefined ? Promise.resolve(undefined) : getAgentPlanById(id),
    onError: (error: AxiosError) => console.log("error, ", error),
    enabled: id !== undefined,
  });

  return {
    agentPlan: data,
    isLoading,
    fetchError: error,
  };
};

export const useCreateAgentPlanMutation = (
  onSuccess: () => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgentPlan,
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: [AGENT_PLANS_QUERY_KEY] });
    },
    onError: onError,
  });
};

export const useUpdateAgentPlanMutation = (
  onSuccess: (id: number) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgentPlan,
    onSuccess: (_, { id }) => {
      onSuccess(id);
      queryClient.invalidateQueries({ queryKey: [AGENT_PLANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AGENT_PLAN_QUERY_KEY, id] });
    },
    onError: onError,
  });
};

export const useDeleteAgentPlanMutation = (
  onSuccess: (plan: AgentPlan) => void,
  onError: (err: AxiosError) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: AgentPlan) => deleteAgentPlan(plan.id),
    onSuccess: (_, plan) => {
      onSuccess(plan);
      queryClient.invalidateQueries({ queryKey: [AGENT_PLANS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [AGENT_PLAN_QUERY_KEY, plan.id],
      });
    },
    onError: onError,
  });
};
