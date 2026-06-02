import { FC, useCallback, useState } from "react";
import { AxiosError } from "axios";
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Label,
  Modal,
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from "@patternfly/react-core";
import { CubesIcon, PencilAltIcon, TrashIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import type { AgentPlan } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { useNotifications } from "@app/components/NotificationsContext";
import {
  useDeleteAgentPlanMutation,
  useFetchAgentPlans,
} from "@app/queries/agent-plans";
import { getAxiosErrorMessage } from "@app/utils/utils";

import AgentPlanDetailDrawer from "./components/agent-plan-detail-drawer";
import AgentPlanForm from "./components/agent-plan-form";

const AgentPlans: FC = () => {
  const { pushNotification } = useNotifications();

  const [openCreatePlan, setOpenCreatePlan] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<AgentPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<AgentPlan | null>(null);
  const [activePlan, setActivePlan] = useState<AgentPlan | null>(null);

  const { agentPlans, isLoading, fetchError } = useFetchAgentPlans();

  const onError = useCallback(
    (error: AxiosError) => {
      pushNotification({
        title: getAxiosErrorMessage(error),
        variant: "danger",
      });
    },
    [pushNotification]
  );

  const { mutate: deletePlan } = useDeleteAgentPlanMutation(
    (plan) =>
      pushNotification({
        title: `Deleted agent plan "${plan.metadata.name}"`,
        variant: "success",
      }),
    onError
  );

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">Agent Plans</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(agentPlans.length || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor: "var(--pf-v5-global--BackgroundColor--100)",
            }}
          >
            <Toolbar>
              <ToolbarContent>
                <ToolbarGroup variant="button-group">
                  <ToolbarItem>
                    <Button
                      type="button"
                      id="create-new-agent-plan"
                      aria-label="Create new agent plan"
                      variant={ButtonVariant.primary}
                      onClick={() => setOpenCreatePlan(true)}
                    >
                      New Agent Plan
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>

            <Table aria-label="Agent plans table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Stages</Th>
                  <Th>Phases</Th>
                  <Th>Ready</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {agentPlans.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <EmptyState variant="sm">
                        <EmptyStateHeader
                          titleText="No agent plans configured"
                          headingLevel="h2"
                          icon={<EmptyStateIcon icon={CubesIcon} />}
                        />
                        <EmptyStateBody>
                          Create an AgentPlan to define a playbook with stages
                          and phases for agentic work.
                        </EmptyStateBody>
                      </EmptyState>
                    </Td>
                  </Tr>
                ) : (
                  agentPlans.map((plan) => {
                    const stageCount =
                      plan.status?.stageCount ?? plan.spec.stages?.length ?? 0;
                    const phaseCount =
                      plan.status?.phaseCount ??
                      plan.spec.stages?.reduce(
                        (sum, s) => sum + (s.phases?.length ?? 0),
                        0
                      ) ??
                      0;
                    return (
                      <Tr
                        key={plan.metadata.name}
                        isClickable
                        onRowClick={() => setActivePlan(plan)}
                      >
                        <Td>{plan.metadata.name}</Td>
                        <Td modifier="truncate">{plan.spec.description}</Td>
                        <Td>{stageCount}</Td>
                        <Td>{phaseCount}</Td>
                        <Td>
                          {plan.status?.ready ? (
                            <Label color="green">Ready</Label>
                          ) : (
                            <Label color="grey">Pending</Label>
                          )}
                        </Td>
                        <Td isActionCell>
                          <Tooltip content="Edit">
                            <Button
                              variant="plain"
                              icon={<PencilAltIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlanToEdit(plan);
                              }}
                            />
                          </Tooltip>
                          <Tooltip content="Delete">
                            <Button
                              variant="plain"
                              icon={<TrashIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlanToDelete(plan);
                              }}
                              isDanger
                            />
                          </Tooltip>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </div>
        </ConditionalRender>
      </PageSection>

      <AgentPlanDetailDrawer
        plan={activePlan}
        onCloseClick={() => setActivePlan(null)}
      />

      <Modal
        title="New Agent Plan"
        variant="medium"
        isOpen={openCreatePlan}
        onClose={() => setOpenCreatePlan(false)}
      >
        <AgentPlanForm onClose={() => setOpenCreatePlan(false)} />
      </Modal>

      <Modal
        title="Edit Agent Plan"
        variant="medium"
        isOpen={!!planToEdit}
        onClose={() => setPlanToEdit(null)}
      >
        <AgentPlanForm
          key={planToEdit?.metadata.name ?? ""}
          plan={planToEdit}
          onClose={() => setPlanToEdit(null)}
        />
      </Modal>

      <ConfirmDialog
        title={`Delete agent plan "${planToDelete?.metadata.name ?? ""}"?`}
        isOpen={!!planToDelete}
        titleIconVariant="warning"
        message="This agent plan will be permanently deleted."
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel="Delete"
        cancelBtnLabel="Cancel"
        onCancel={() => setPlanToDelete(null)}
        onClose={() => setPlanToDelete(null)}
        onConfirm={() => {
          if (planToDelete) {
            deletePlan(planToDelete);
            setPlanToDelete(null);
          }
        }}
      />
    </>
  );
};

export default AgentPlans;
