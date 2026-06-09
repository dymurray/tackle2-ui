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
import { CubesIcon, TrashIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import type { SkillCard } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { useNotifications } from "@app/components/NotificationsContext";
import {
  useFetchSkillCards,
  useDeleteSkillCardMutation,
} from "@app/queries/skillcards";
import { getAxiosErrorMessage } from "@app/utils/utils";

const SkillCards: FC = () => {
  const { pushNotification } = useNotifications();
  const [skillCardToDelete, setSkillCardToDelete] = useState<SkillCard | null>(
    null
  );

  const { skillCards, isLoading, fetchError } = useFetchSkillCards();

  const onError = useCallback(
    (error: AxiosError) => {
      pushNotification({
        title: getAxiosErrorMessage(error),
        variant: "danger",
      });
    },
    [pushNotification]
  );

  const { mutate: deleteSkillCard } = useDeleteSkillCardMutation(
    (sc) =>
      pushNotification({
        title: `Deleted skill card "${sc.metadata.name}"`,
        variant: "success",
      }),
    onError
  );

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">Skill Cards</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(skillCards.length || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor: "var(--pf-v5-global--BackgroundColor--100)",
            }}
          >
            <Table aria-label="Skill cards table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th>Source</Th>
                  <Th>Ready</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {skillCards.length === 0 ? (
                  <Tr>
                    <Td colSpan={6}>
                      <EmptyState variant="sm">
                        <EmptyStateHeader
                          titleText="No skill cards"
                          headingLevel="h2"
                          icon={<EmptyStateIcon icon={CubesIcon} />}
                        />
                        <EmptyStateBody>
                          SkillCard CRDs define individual skills or rules for
                          agents.
                        </EmptyStateBody>
                      </EmptyState>
                    </Td>
                  </Tr>
                ) : (
                  skillCards.map((sc) => (
                    <Tr key={sc.metadata.name}>
                      <Td>{sc.metadata.name}</Td>
                      <Td>
                        <Label
                          color={
                            sc.spec.type === "rule" ? "orange" : "blue"
                          }
                        >
                          {sc.spec.type || "skill"}
                        </Label>
                      </Td>
                      <Td modifier="truncate">{sc.spec.description}</Td>
                      <Td>
                        {sc.spec.image
                          ? "OCI image"
                          : sc.spec.content
                            ? "Inline"
                            : "—"}
                      </Td>
                      <Td>
                        {sc.status?.ready === true ? (
                          <Label color="green">Ready</Label>
                        ) : sc.status?.ready === false ? (
                          <Label color="grey">Pending</Label>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td isActionCell>
                        <Tooltip content="Delete">
                          <Button
                            variant="plain"
                            icon={<TrashIcon />}
                            onClick={() => setSkillCardToDelete(sc)}
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

      <ConfirmDialog
        title={`Delete skill card "${skillCardToDelete?.metadata.name ?? ""}"?`}
        isOpen={!!skillCardToDelete}
        titleIconVariant="warning"
        message="This skill card will be permanently deleted."
        confirmBtnVariant={ButtonVariant.danger}
        confirmBtnLabel="Delete"
        cancelBtnLabel="Cancel"
        onCancel={() => setSkillCardToDelete(null)}
        onClose={() => setSkillCardToDelete(null)}
        onConfirm={() => {
          if (skillCardToDelete) {
            deleteSkillCard(skillCardToDelete);
            setSkillCardToDelete(null);
          }
        }}
      />
    </>
  );
};

export default SkillCards;
