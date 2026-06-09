import { FC, useCallback, useState } from "react";
import { AxiosError } from "axios";
import {
  ButtonVariant,
  Button,
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

import type { LLMProvider } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { useNotifications } from "@app/components/NotificationsContext";
import {
  useFetchLLMProviders,
  useDeleteLLMProviderMutation,
} from "@app/queries/llmproviders";
import { getAxiosErrorMessage } from "@app/utils/utils";

import LLMProviderForm from "./components/llm-provider-form";

const LLMProviders: FC = () => {
  const { pushNotification } = useNotifications();
  const [toDelete, setToDelete] = useState<LLMProvider | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [providerToEdit, setProviderToEdit] = useState<LLMProvider | null>(
    null
  );

  const { llmProviders, isLoading, fetchError } = useFetchLLMProviders();

  const onError = useCallback(
    (error: AxiosError) => {
      pushNotification({
        title: getAxiosErrorMessage(error),
        variant: "danger",
      });
    },
    [pushNotification]
  );

  const { mutate: doDelete } = useDeleteLLMProviderMutation(
    (p) =>
      pushNotification({
        title: `Deleted LLM provider "${p.metadata.name}"`,
        variant: "success",
      }),
    onError
  );

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">LLM Providers</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(llmProviders.length || fetchError)}
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
                      id="create-new-llm-provider"
                      aria-label="Create new LLM provider"
                      variant={ButtonVariant.primary}
                      onClick={() => setOpenCreate(true)}
                    >
                      New LLM Provider
                    </Button>
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>

            <Table aria-label="LLM providers table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Provider</Th>
                  <Th>Models</Th>
                  <Th>Ready</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {llmProviders.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <EmptyState variant="sm">
                        <EmptyStateHeader
                          titleText="No LLM providers"
                          headingLevel="h2"
                          icon={<EmptyStateIcon icon={CubesIcon} />}
                        />
                        <EmptyStateBody>
                          LLMProvider CRDs define LLM endpoints, credentials,
                          and available models.
                        </EmptyStateBody>
                      </EmptyState>
                    </Td>
                  </Tr>
                ) : (
                  llmProviders.map((p) => (
                    <Tr key={p.metadata.name}>
                      <Td>{p.metadata.name}</Td>
                      <Td modifier="truncate">{p.spec.description}</Td>
                      <Td>{p.spec.provider || "—"}</Td>
                      <Td>
                        {p.spec.models?.map((m) => m.name).join(", ") || "—"}
                      </Td>
                      <Td>
                        {p.status?.ready === true ? (
                          <Label color="green">Ready</Label>
                        ) : p.status?.ready === false ? (
                          <Label color="grey">Pending</Label>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td isActionCell>
                        <Tooltip content="Edit">
                          <Button
                            variant="plain"
                            icon={<PencilAltIcon />}
                            onClick={() => setProviderToEdit(p)}
                          />
                        </Tooltip>
                        <Tooltip content="Delete">
                          <Button
                            variant="plain"
                            icon={<TrashIcon />}
                            onClick={() => setToDelete(p)}
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

      <Modal
        title="New LLM Provider"
        variant="medium"
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
      >
        <LLMProviderForm onClose={() => setOpenCreate(false)} />
      </Modal>

      <Modal
        title="Edit LLM Provider"
        variant="medium"
        isOpen={!!providerToEdit}
        onClose={() => setProviderToEdit(null)}
      >
        <LLMProviderForm
          key={providerToEdit?.metadata.name ?? ""}
          llmProvider={providerToEdit}
          onClose={() => setProviderToEdit(null)}
        />
      </Modal>

      <ConfirmDialog
        title={`Delete LLM provider "${toDelete?.metadata.name ?? ""}"?`}
        isOpen={!!toDelete}
        titleIconVariant="warning"
        message="This LLM provider will be permanently deleted."
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel="Delete"
        cancelBtnLabel="Cancel"
        onCancel={() => setToDelete(null)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            doDelete(toDelete);
            setToDelete(null);
          }
        }}
      />
    </>
  );
};

export default LLMProviders;
