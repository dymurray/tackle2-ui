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
import { AgentRecipe } from "@app/api/models";
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
  useDeleteAgentRecipeMutation,
  useFetchAgentRecipes,
} from "@app/queries/agent-recipes";
import { getAxiosErrorMessage } from "@app/utils/utils";

import AgentRecipeDetailDrawer from "./components/agent-recipe-detail-drawer";
import AgentRecipeForm from "./components/agent-recipe-form";
import { parsePalletYaml } from "./components/pallet-utils";

const sourceCount = (yaml: string): number => {
  const cfg = parsePalletYaml(yaml);
  return cfg ? cfg.sources.length : 0;
};

const AgentRecipes: FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pushNotification } = useNotifications();

  const [openCreateRecipe, setOpenCreateRecipe] = useState<boolean>(false);
  const [recipeToEdit, setRecipeToEdit] = useState<AgentRecipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<AgentRecipe | null>(
    null
  );

  const { agentRecipes, isLoading, fetchError } = useFetchAgentRecipes();

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
    (recipeDeleted: AgentRecipe) => {
      pushNotification({
        title: `Successfully deleted agent recipe "${recipeDeleted.name}"`,
        variant: "success",
      });
    },
    [pushNotification]
  );

  const { mutate: deleteRecipe } = useDeleteAgentRecipeMutation(
    onDeleteSuccess,
    onError
  );

  const getSortValues = useCallback(
    (recipe: AgentRecipe) => ({
      name: recipe.name ?? "",
      description: recipe.description ?? "",
      sources: sourceCount(recipe.yaml),
    }),
    []
  );

  const tableControls = useLocalTableControls({
    tableName: "agent-recipes-table",
    persistTo: "urlParams",
    persistenceKeyPrefix: TablePersistenceKeyPrefix.agentRecipes,
    idProperty: "id",
    dataNameProperty: "name",
    items: agentRecipes || [],
    isLoading: isLoading,
    hasActionsColumn: true,
    columnNames: {
      name: t("terms.name"),
      description: t("terms.description"),
      sources: "Sources",
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
        getItemValue: (recipe: AgentRecipe) => recipe?.name ?? "",
      },
    ],
    sortableColumns: ["name", "description", "sources"],
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
          <Text component="h1">Agent Recipes</Text>
          <Text component="small">
            Reusable pallet configurations. An agent can include one or more
            recipes; their sources are merged when a migration is run.
          </Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(agentRecipes || fetchError)}
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
                      id="create-new-agent-recipe"
                      aria-label="Create new agent recipe"
                      variant={ButtonVariant.primary}
                      onClick={() => setOpenCreateRecipe(true)}
                    >
                      New Agent Recipe
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarItem {...paginationToolbarItemProps}>
                  <SimplePagination
                    idPrefix="agent-recipes-table"
                    isTop
                    paginationProps={paginationProps}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            <Table
              {...tableProps}
              id="agent-recipes-table"
              aria-label="agent recipes table"
            >
              <Thead>
                <Tr>
                  <TableHeaderContentWithControls {...tableControls}>
                    <Th {...getThProps({ columnKey: "name" })} />
                    <Th {...getThProps({ columnKey: "description" })} />
                    <Th {...getThProps({ columnKey: "sources" })} />
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
                      titleText="No agent recipes configured"
                      headingLevel="h2"
                      icon={<EmptyStateIcon icon={CubesIcon} />}
                    />
                    <EmptyStateBody>
                      Create a recipe to define a reusable pallet configuration.
                      Recipes are referenced by agents and merged at migration
                      time.
                    </EmptyStateBody>
                  </EmptyState>
                }
                numRenderedColumns={numRenderedColumns}
              >
                <Tbody>
                  {currentPageItems?.map((recipe, rowIndex) => (
                    <Tr key={recipe.id} {...getTrProps({ item: recipe })}>
                      <TableRowContentWithControls
                        {...tableControls}
                        item={recipe}
                        rowIndex={rowIndex}
                      >
                        <Td
                          {...getTdProps({ columnKey: "name" })}
                          modifier="truncate"
                        >
                          {recipe.name}
                        </Td>
                        <Td
                          {...getTdProps({ columnKey: "description" })}
                          modifier="truncate"
                        >
                          {recipe.description || "—"}
                        </Td>
                        <Td {...getTdProps({ columnKey: "sources" })}>
                          {sourceCount(recipe.yaml)}
                        </Td>

                        <Td isActionCell id="pencil-action">
                          <Tooltip content={t("actions.edit")}>
                            <Button
                              variant="plain"
                              icon={<PencilAltIcon />}
                              onClick={() => setRecipeToEdit(recipe)}
                            />
                          </Tooltip>
                        </Td>

                        <Td isActionCell id="delete-action">
                          <Tooltip content={t("actions.delete")}>
                            <Button
                              variant="plain"
                              icon={<TrashIcon />}
                              onClick={() => setRecipeToDelete(recipe)}
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
              idPrefix="agent-recipes-table"
              isTop={false}
              paginationProps={paginationProps}
            />
          </div>
        </ConditionalRender>
      </PageSection>

      <AgentRecipeDetailDrawer
        recipe={activeItem}
        onCloseClick={clearActiveItem}
      />

      {/* Create modal */}
      <Modal
        title="New Agent Recipe"
        variant="medium"
        isOpen={openCreateRecipe}
        onClose={() => setOpenCreateRecipe(false)}
      >
        <AgentRecipeForm
          key={openCreateRecipe ? 1 : 0}
          onClose={() => setOpenCreateRecipe(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        title="Edit Agent Recipe"
        variant="medium"
        isOpen={!!recipeToEdit}
        onClose={() => setRecipeToEdit(null)}
      >
        <AgentRecipeForm
          key={recipeToEdit?.id ?? -1}
          recipe={recipeToEdit}
          onClose={() => setRecipeToEdit(null)}
        />
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmDialog
        title={`Delete agent recipe "${recipeToDelete?.name ?? ""}"?`}
        isOpen={!!recipeToDelete}
        titleIconVariant="warning"
        message={t("dialog.message.delete")}
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel={t("actions.delete")}
        cancelBtnLabel={t("actions.cancel")}
        onCancel={() => setRecipeToDelete(null)}
        onClose={() => setRecipeToDelete(null)}
        onConfirm={() => {
          if (recipeToDelete) {
            deleteRecipe(recipeToDelete);
            setRecipeToDelete(null);
          }
        }}
      />
    </>
  );
};

export default AgentRecipes;
