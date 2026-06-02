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

import type { Agent } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { useNotifications } from "@app/components/NotificationsContext";
import { useDeleteAgentMutation, useFetchAgents } from "@app/queries/agents";
import { getAxiosErrorMessage } from "@app/utils/utils";

import AgentDetailDrawer from "./components/agent-detail-drawer";
import AgentForm from "./components/agent-form";

const Agents: FC = () => {
  const { pushNotification } = useNotifications();

  const [openCreateAgent, setOpenCreateAgent] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  const { agents, isLoading, fetchError } = useFetchAgents();

  const onError = useCallback(
    (error: AxiosError) => {
      pushNotification({
        title: getAxiosErrorMessage(error),
        variant: "danger",
      });
    },
    [pushNotification]
  );

  const { mutate: deleteAgent } = useDeleteAgentMutation(
    (agent) =>
      pushNotification({
        title: `Deleted agent "${agent.metadata.name}"`,
        variant: "success",
      }),
    onError
  );

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">Agents</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(agents.length || fetchError)}
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
                      id="create-new-agent"
                      aria-label="Create new agent"
                      variant={ButtonVariant.primary}
                      onClick={() => setOpenCreateAgent(true)}
                    >
                      New Agent
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>

            <Table aria-label="Agents table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>LLM Provider</Th>
                  <Th>Model</Th>
                  <Th>Ready</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {agents.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <EmptyState variant="sm">
                        <EmptyStateHeader
                          titleText="No agents configured"
                          headingLevel="h2"
                          icon={<EmptyStateIcon icon={CubesIcon} />}
                        />
                        <EmptyStateBody>
                          Create an Agent to define skills, LLM configuration,
                          and a container image for running agentic workloads.
                        </EmptyStateBody>
                      </EmptyState>
                    </Td>
                  </Tr>
                ) : (
                  agents.map((agent) => (
                    <Tr
                      key={agent.metadata.name}
                      isClickable
                      onRowClick={() => setActiveAgent(agent)}
                    >
                      <Td>{agent.metadata.name}</Td>
                      <Td modifier="truncate">{agent.spec.description}</Td>
                      <Td>{agent.spec.llmProviderRef?.name || "—"}</Td>
                      <Td>{agent.spec.model || "—"}</Td>
                      <Td>
                        {agent.status?.ready ? (
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
                              setAgentToEdit(agent);
                            }}
                          />
                        </Tooltip>
                        <Tooltip content="Delete">
                          <Button
                            variant="plain"
                            icon={<TrashIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgentToDelete(agent);
                            }}
                            isDanger
                          />
                        </Tooltip>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </ConditionalRender>
      </PageSection>

      <AgentDetailDrawer
        agent={activeAgent}
        onCloseClick={() => setActiveAgent(null)}
      />

      <Modal
        title="New Agent"
        variant="medium"
        isOpen={openCreateAgent}
        onClose={() => setOpenCreateAgent(false)}
      >
        <AgentForm onClose={() => setOpenCreateAgent(false)} />
      </Modal>

      <Modal
        title="Edit Agent"
        variant="medium"
        isOpen={!!agentToEdit}
        onClose={() => setAgentToEdit(null)}
      >
        <AgentForm
          key={agentToEdit?.metadata.name ?? ""}
          agent={agentToEdit}
          onClose={() => setAgentToEdit(null)}
        />
      </Modal>

      <ConfirmDialog
        title={`Delete agent "${agentToDelete?.metadata.name ?? ""}"?`}
        isOpen={!!agentToDelete}
        titleIconVariant="warning"
        message="This agent will be permanently deleted."
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel="Delete"
        cancelBtnLabel="Cancel"
        onCancel={() => setAgentToDelete(null)}
        onClose={() => setAgentToDelete(null)}
        onConfirm={() => {
          if (agentToDelete) {
            deleteAgent(agentToDelete);
            setAgentToDelete(null);
          }
        }}
      />
    </>
  );
};

export default Agents;
