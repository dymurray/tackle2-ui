import { FC, useCallback, useState } from "react";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
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

import { TablePersistenceKeyPrefix } from "@app/Constants";
import { AgentConfig } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { FilterToolbar, FilterType } from "@app/components/FilterToolbar";
import { useNotifications } from "@app/components/NotificationsContext";
import { SimplePagination } from "@app/components/SimplePagination";
import {
  ConditionalTableBody,
  TableHeaderContentWithControls,
  TableRowContentWithControls,
} from "@app/components/TableControls";
import { useLocalTableControls } from "@app/hooks/table-controls";
import { useDeleteAgentMutation, useFetchAgents } from "@app/queries/agents";
import { getAxiosErrorMessage } from "@app/utils/utils";

import AgentDetailDrawer from "./components/agent-detail-drawer";
import AgentForm from "./components/agent-form";

const Agents: FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pushNotification } = useNotifications();

  const [openCreateAgent, setOpenCreateAgent] = useState<boolean>(false);
  const [agentToEdit, setAgentToEdit] = useState<AgentConfig | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentConfig | null>(null);

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

  const onDeleteSuccess = useCallback(
    (agentDeleted: AgentConfig) => {
      pushNotification({
        title: `Successfully deleted agent "${agentDeleted.name}"`,
        variant: "success",
      });
    },
    [pushNotification]
  );

  const { mutate: deleteAgent } = useDeleteAgentMutation(
    onDeleteSuccess,
    onError
  );

  const getSortValues = useCallback(
    (agent: AgentConfig) => ({
      name: agent.name ?? "",
      description: agent.description ?? "",
      model: agent.modelConfig?.model ?? "",
    }),
    []
  );

  const tableControls = useLocalTableControls({
    tableName: "agents-table",
    persistTo: "urlParams",
    persistenceKeyPrefix: TablePersistenceKeyPrefix.agents,
    idProperty: "id",
    dataNameProperty: "name",
    items: agents || [],
    isLoading: isLoading,
    hasActionsColumn: true,
    columnNames: {
      name: t("terms.name"),
      description: t("terms.description"),
      model: "Model",
    },
    isFilterEnabled: true,
    isSortEnabled: true,
    isPaginationEnabled: true,
    isActiveItemEnabled: true,
    filterCategories: [
      {
        categoryKey: "name",
        title: t("terms.name"),
        type: FilterType.search,
        placeholderText:
          t("actions.filterBy", {
            what: t("terms.name").toLowerCase(),
          }) + "...",
        getItemValue: (agent: AgentConfig) => {
          return agent?.name ?? "";
        },
      },
    ],
    sortableColumns: ["name", "description", "model"],
    getSortValues,
    initialSort: { columnKey: "name", direction: "asc" },
  });

  const {
    currentPageItems,
    numRenderedColumns,
    propHelpers: {
      toolbarProps,
      filterToolbarProps,
      paginationToolbarItemProps,
      paginationProps,
      tableProps,
      getThProps,
      getTrProps,
      getTdProps,
    },
    activeItemDerivedState: { activeItem, clearActiveItem },
  } = tableControls;

  const clearFilters = useCallback(() => {
    const currentPath = history.location.pathname;
    const newSearch = new URLSearchParams(history.location.search);
    newSearch.delete("filters");
    history.push(`${currentPath}?${newSearch.toString()}`);
    filterToolbarProps.setFilterValues({});
  }, [history, filterToolbarProps]);

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">Agents</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(agents || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor: "var(--pf-v5-global--BackgroundColor--100)",
            }}
          >
            <Toolbar {...toolbarProps} clearAllFilters={clearFilters}>
              <ToolbarContent>
                <FilterToolbar {...filterToolbarProps} />
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
                <ToolbarItem {...paginationToolbarItemProps}>
                  <SimplePagination
                    idPrefix="agents-table"
                    isTop
                    paginationProps={paginationProps}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            <Table {...tableProps} id="agents-table" aria-label="agents table">
              <Thead>
                <Tr>
                  <TableHeaderContentWithControls {...tableControls}>
                    <Th {...getThProps({ columnKey: "name" })} />
                    <Th {...getThProps({ columnKey: "description" })} />
                    <Th {...getThProps({ columnKey: "model" })} />
                  </TableHeaderContentWithControls>
                </Tr>
              </Thead>
              <ConditionalTableBody
                isLoading={isLoading}
                isError={!!fetchError}
                isNoData={currentPageItems.length === 0}
                noDataEmptyState={
                  <EmptyState variant="sm">
                    <EmptyStateHeader
                      titleText="No agents configured"
                      headingLevel="h2"
                      icon={<EmptyStateIcon icon={CubesIcon} />}
                    />
                    <EmptyStateBody>
                      Create an agent to define a pallet and (optionally) a
                      model configuration for running AI-assisted migrations.
                    </EmptyStateBody>
                  </EmptyState>
                }
                numRenderedColumns={numRenderedColumns}
              >
                <Tbody>
                  {currentPageItems?.map((agent, rowIndex) => (
                    <Tr key={agent.id} {...getTrProps({ item: agent })}>
                      <TableRowContentWithControls
                        {...tableControls}
                        item={agent}
                        rowIndex={rowIndex}
                      >
                        <Td
                          {...getTdProps({ columnKey: "name" })}
                          modifier="truncate"
                        >
                          {agent.name}
                        </Td>
                        <Td
                          {...getTdProps({ columnKey: "description" })}
                          modifier="truncate"
                        >
                          {agent.description || "—"}
                        </Td>
                        <Td
                          {...getTdProps({ columnKey: "model" })}
                          modifier="truncate"
                        >
                          {agent.modelConfig?.model || "—"}
                        </Td>

                        <Td isActionCell id="pencil-action">
                          <Tooltip content={t("actions.edit")}>
                            <Button
                              variant="plain"
                              icon={<PencilAltIcon />}
                              onClick={() => setAgentToEdit(agent)}
                            />
                          </Tooltip>
                        </Td>

                        <Td isActionCell id="delete-action">
                          <Tooltip content={t("actions.delete")}>
                            <Button
                              variant="plain"
                              icon={<TrashIcon />}
                              onClick={() => setAgentToDelete(agent)}
                              isDanger={true}
                            />
                          </Tooltip>
                        </Td>
                      </TableRowContentWithControls>
                    </Tr>
                  ))}
                </Tbody>
              </ConditionalTableBody>
            </Table>
            <SimplePagination
              idPrefix="agents-table"
              isTop={false}
              paginationProps={paginationProps}
            />
          </div>
        </ConditionalRender>
      </PageSection>

      <AgentDetailDrawer agent={activeItem} onCloseClick={clearActiveItem} />

      {/* Create modal */}
      <Modal
        title="New Agent"
        variant="medium"
        isOpen={openCreateAgent}
        onClose={() => setOpenCreateAgent(false)}
      >
        <AgentForm
          key={openCreateAgent ? 1 : 0}
          onClose={() => setOpenCreateAgent(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        title="Edit Agent"
        variant="medium"
        isOpen={!!agentToEdit}
        onClose={() => setAgentToEdit(null)}
      >
        <AgentForm
          key={agentToEdit?.id ?? -1}
          agent={agentToEdit}
          onClose={() => setAgentToEdit(null)}
        />
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmDialog
        title={`Delete agent "${agentToDelete?.name ?? ""}"?`}
        isOpen={!!agentToDelete}
        titleIconVariant="warning"
        message={t("dialog.message.delete")}
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel={t("actions.delete")}
        cancelBtnLabel={t("actions.cancel")}
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
