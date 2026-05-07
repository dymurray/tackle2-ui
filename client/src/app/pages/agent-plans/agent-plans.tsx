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
import { AgentPlan } from "@app/api/models";
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
import {
  useDeleteAgentPlanMutation,
  useFetchAgentPlans,
} from "@app/queries/agent-plans";
import { getAxiosErrorMessage } from "@app/utils/utils";

import AgentPlanDetailDrawer from "./components/agent-plan-detail-drawer";
import AgentPlanForm from "./components/agent-plan-form";

const previewMarkdown = (markdown: string): string => {
  if (!markdown) return "—";
  const collapsed = markdown.replace(/\s+/g, " ").trim();
  return collapsed.length > 80 ? `${collapsed.slice(0, 80)}…` : collapsed;
};

const AgentPlans: FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pushNotification } = useNotifications();

  const [openCreatePlan, setOpenCreatePlan] = useState<boolean>(false);
  const [planToEdit, setPlanToEdit] = useState<AgentPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<AgentPlan | null>(null);

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

  const onDeleteSuccess = useCallback(
    (planDeleted: AgentPlan) => {
      pushNotification({
        title: `Successfully deleted agent plan "${planDeleted.name}"`,
        variant: "success",
      });
    },
    [pushNotification]
  );

  const { mutate: deletePlan } = useDeleteAgentPlanMutation(
    onDeleteSuccess,
    onError
  );

  const getSortValues = useCallback(
    (plan: AgentPlan) => ({
      name: plan.name ?? "",
    }),
    []
  );

  const tableControls = useLocalTableControls({
    tableName: "agent-plans-table",
    persistTo: "urlParams",
    persistenceKeyPrefix: TablePersistenceKeyPrefix.agentPlans,
    idProperty: "id",
    dataNameProperty: "name",
    items: agentPlans || [],
    isLoading: isLoading,
    hasActionsColumn: true,
    columnNames: {
      name: t("terms.name"),
      preview: "Preview",
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
        getItemValue: (plan: AgentPlan) => plan?.name ?? "",
      },
    ],
    sortableColumns: ["name"],
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
          <Text component="h1">Agent Plans</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(agentPlans || fetchError)}
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
                      id="create-new-agent-plan"
                      aria-label="Create new agent plan"
                      variant={ButtonVariant.primary}
                      onClick={() => setOpenCreatePlan(true)}
                    >
                      New Agent Plan
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem {...paginationToolbarItemProps}>
                  <SimplePagination
                    idPrefix="agent-plans-table"
                    isTop
                    paginationProps={paginationProps}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            <Table
              {...tableProps}
              id="agent-plans-table"
              aria-label="agent plans table"
            >
              <Thead>
                <Tr>
                  <TableHeaderContentWithControls {...tableControls}>
                    <Th {...getThProps({ columnKey: "name" })} />
                    <Th {...getThProps({ columnKey: "preview" })} />
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
                      titleText="No agent plans configured"
                      headingLevel="h2"
                      icon={<EmptyStateIcon icon={CubesIcon} />}
                    />
                    <EmptyStateBody>
                      Create an agent plan by giving it a name and pasting
                      markdown that describes the steps the agent should follow.
                    </EmptyStateBody>
                  </EmptyState>
                }
                numRenderedColumns={numRenderedColumns}
              >
                <Tbody>
                  {currentPageItems?.map((plan, rowIndex) => (
                    <Tr key={plan.id} {...getTrProps({ item: plan })}>
                      <TableRowContentWithControls
                        {...tableControls}
                        item={plan}
                        rowIndex={rowIndex}
                      >
                        <Td
                          {...getTdProps({ columnKey: "name" })}
                          modifier="truncate"
                        >
                          {plan.name}
                        </Td>
                        <Td
                          {...getTdProps({ columnKey: "preview" })}
                          modifier="truncate"
                        >
                          {previewMarkdown(plan.markdown)}
                        </Td>

                        <Td isActionCell id="pencil-action">
                          <Tooltip content={t("actions.edit")}>
                            <Button
                              variant="plain"
                              icon={<PencilAltIcon />}
                              onClick={() => setPlanToEdit(plan)}
                            />
                          </Tooltip>
                        </Td>

                        <Td isActionCell id="delete-action">
                          <Tooltip content={t("actions.delete")}>
                            <Button
                              variant="plain"
                              icon={<TrashIcon />}
                              onClick={() => setPlanToDelete(plan)}
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
              idPrefix="agent-plans-table"
              isTop={false}
              paginationProps={paginationProps}
            />
          </div>
        </ConditionalRender>
      </PageSection>

      <AgentPlanDetailDrawer plan={activeItem} onCloseClick={clearActiveItem} />

      {/* Create modal */}
      <Modal
        title="New Agent Plan"
        variant="medium"
        isOpen={openCreatePlan}
        onClose={() => setOpenCreatePlan(false)}
      >
        <AgentPlanForm
          key={openCreatePlan ? 1 : 0}
          onClose={() => setOpenCreatePlan(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        title="Edit Agent Plan"
        variant="medium"
        isOpen={!!planToEdit}
        onClose={() => setPlanToEdit(null)}
      >
        <AgentPlanForm
          key={planToEdit?.id ?? -1}
          plan={planToEdit}
          onClose={() => setPlanToEdit(null)}
        />
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmDialog
        title={`Delete agent plan "${planToDelete?.name ?? ""}"?`}
        isOpen={!!planToDelete}
        titleIconVariant="warning"
        message={t("dialog.message.delete")}
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel={t("actions.delete")}
        cancelBtnLabel={t("actions.cancel")}
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
