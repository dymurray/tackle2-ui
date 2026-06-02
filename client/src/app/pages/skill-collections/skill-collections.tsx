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
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  Tooltip,
} from "@patternfly/react-core";
import { CubesIcon, TrashIcon } from "@patternfly/react-icons";
import { Table, Tbody, Td, Th, Thead, Tr } from "@patternfly/react-table";

import type { SkillCollection } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { ConfirmDialog } from "@app/components/ConfirmDialog";
import { useNotifications } from "@app/components/NotificationsContext";
import {
  useFetchSkillCollections,
  useDeleteSkillCollectionMutation,
} from "@app/queries/skillcollections";
import { getAxiosErrorMessage } from "@app/utils/utils";

const SkillCollections: FC = () => {
  const { pushNotification } = useNotifications();
  const [toDelete, setToDelete] = useState<SkillCollection | null>(null);

  const { skillCollections, isLoading, fetchError } =
    useFetchSkillCollections();

  const onError = useCallback(
    (error: AxiosError) => {
      pushNotification({
        title: getAxiosErrorMessage(error),
        variant: "danger",
      });
    },
    [pushNotification]
  );

  const { mutate: doDelete } = useDeleteSkillCollectionMutation(
    (sc) =>
      pushNotification({
        title: `Deleted skill collection "${sc.metadata.name}"`,
        variant: "success",
      }),
    onError
  );

  return (
    <>
      <PageSection variant={PageSectionVariants.light}>
        <TextContent>
          <Text component="h1">Skill Collections</Text>
        </TextContent>
      </PageSection>
      <PageSection>
        <ConditionalRender
          when={isLoading && !(skillCollections.length || fetchError)}
          then={<AppPlaceholder />}
        >
          <div
            style={{
              backgroundColor: "var(--pf-v5-global--BackgroundColor--100)",
            }}
          >
            <Table aria-label="Skill collections table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Skills</Th>
                  <Th>Ready</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {skillCollections.length === 0 ? (
                  <Tr>
                    <Td colSpan={5}>
                      <EmptyState variant="sm">
                        <EmptyStateHeader
                          titleText="No skill collections"
                          headingLevel="h2"
                          icon={<EmptyStateIcon icon={CubesIcon} />}
                        />
                        <EmptyStateBody>
                          SkillCollection CRDs group skills from OCI images or
                          git sources.
                        </EmptyStateBody>
                      </EmptyState>
                    </Td>
                  </Tr>
                ) : (
                  skillCollections.map((sc) => (
                    <Tr key={sc.metadata.name}>
                      <Td>{sc.metadata.name}</Td>
                      <Td modifier="truncate">{sc.spec.description}</Td>
                      <Td>{sc.status?.skillCount ?? sc.spec.skills?.length ?? 0}</Td>
                      <Td>
                        {sc.status?.ready ? (
                          <Label color="green">Ready</Label>
                        ) : (
                          <Label color="grey">Pending</Label>
                        )}
                      </Td>
                      <Td isActionCell>
                        <Tooltip content="Delete">
                          <Button
                            variant="plain"
                            icon={<TrashIcon />}
                            onClick={() => setToDelete(sc)}
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
        title={`Delete skill collection "${toDelete?.metadata.name ?? ""}"?`}
        isOpen={!!toDelete}
        titleIconVariant="warning"
        message="This skill collection will be permanently deleted."
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

export default SkillCollections;
