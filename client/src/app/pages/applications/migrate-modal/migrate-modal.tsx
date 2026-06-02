import React, { useCallback, useState } from "react";
import {
  Alert,
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Spinner,
  Text,
  TextContent,
  TextInput,
} from "@patternfly/react-core";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@patternfly/react-icons";

import { Taskgroup } from "@app/api/models";
import { createTaskgroup, submitTaskgroup } from "@app/api/rest";
import { FilterSelectOptionProps } from "@app/components/FilterToolbar/FilterToolbar";
import TypeaheadSelect from "@app/components/FilterToolbar/components/TypeaheadSelect";
import { useNotifications } from "@app/components/NotificationsContext";
import { useFetchAgentPlans } from "@app/queries/agent-plans";
import { useFetchAgents } from "@app/queries/agents";

export interface MigrateModalProps {
  applications: Array<{ id: number; name: string }>;
  isOpen: boolean;
  onClose: () => void;
}

type SubmitStatus =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success"; taskgroupId: number; taskgroupName: string }
  | { phase: "error"; message: string };

export const MigrateModal: React.FC<MigrateModalProps> = ({
  applications,
  isOpen,
  onClose,
}) => {
  const { pushNotification } = useNotifications();
  const { agents } = useFetchAgents();
  const { agentPlans } = useFetchAgentPlans();
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedPlanName, setSelectedPlanName] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>({ phase: "idle" });

  const agentOptions: FilterSelectOptionProps[] = (agents || []).map((a) => ({
    value: a.metadata.name,
    label: `${a.metadata.name}${a.spec.model ? ` (${a.spec.model})` : ""}`,
  }));

  const planOptions: FilterSelectOptionProps[] = (agentPlans || []).map(
    (p) => ({
      value: p.metadata.name,
      label: p.metadata.name,
    })
  );

  const selectedAgent = agents.find(
    (a) => a.metadata.name === selectedAgentName
  );
  const selectedPlan = agentPlans.find(
    (p) => p.metadata.name === selectedPlanName
  );

  const handleClose = () => {
    setStatus({ phase: "idle" });
    setSelectedAgentName("");
    setSelectedPlanName("");
    setBranch("");
    onClose();
  };

  const trimmedBranch = branch.trim();

  const handleSubmit = useCallback(async () => {
    if (!selectedAgent || !selectedPlan || !trimmedBranch) return;
    setStatus({ phase: "submitting" });

    try {
      const taskgroupPayload = {
        name: `migration-${selectedAgent.metadata.name}-${Date.now()}`,
        kind: "migration",
        data: {
          agent: {
            name: selectedAgent.metadata.name,
            description: selectedAgent.spec.description,
            model: selectedAgent.spec.model,
            llmProvider: selectedAgent.spec.llmProviderRef?.name,
          },
          plan: {
            name: selectedPlan.metadata.name,
            description: selectedPlan.spec.description,
          },
          branch: trimmedBranch,
        },
        tasks: applications.map((app) => ({
          name: `${selectedAgent.metadata.name}.${app.name}.migration`,
          data: { branch: trimmedBranch },
          application: { id: app.id, name: app.name },
        })),
      } as unknown as Taskgroup;

      const created = await createTaskgroup(taskgroupPayload);
      await submitTaskgroup(created);

      setStatus({
        phase: "success",
        taskgroupId: created.id,
        taskgroupName: created.name,
      });

      pushNotification({
        title: `Migration submitted for ${applications.length} application(s)`,
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus({ phase: "error", message });

      pushNotification({
        title: `Failed to submit migration: ${message}`,
        variant: "danger",
      });
    }
  }, [
    selectedAgent,
    selectedPlan,
    trimmedBranch,
    applications,
    pushNotification,
  ]);

  return (
    <Modal
      title="Run Migration"
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      actions={
        status.phase === "success"
          ? [
              <Button
                key="done"
                variant={ButtonVariant.primary}
                onClick={handleClose}
              >
                Done
              </Button>,
            ]
          : [
              <Button
                key="submit"
                variant={ButtonVariant.primary}
                onClick={handleSubmit}
                isDisabled={
                  !selectedAgent ||
                  !selectedPlan ||
                  !trimmedBranch ||
                  status.phase === "submitting"
                }
                isLoading={status.phase === "submitting"}
              >
                Run Migration
              </Button>,
              <Button
                key="cancel"
                variant={ButtonVariant.link}
                onClick={handleClose}
                isDisabled={status.phase === "submitting"}
              >
                Cancel
              </Button>,
            ]
      }
    >
      {status.phase === "success" && (
        <Alert
          variant="success"
          isInline
          title="Migration submitted successfully"
          style={{ marginBottom: 16 }}
        >
          <TextContent>
            <Text component="small">
              <CheckCircleIcon
                style={{ color: "var(--pf-v5-global--success-color--100)" }}
              />{" "}
              TaskGroup <strong>#{status.taskgroupId}</strong> created and
              submitted.
            </Text>
            <Text component="small">
              Name: <code>{status.taskgroupName}</code>
            </Text>
          </TextContent>
        </Alert>
      )}

      {status.phase === "error" && (
        <Alert
          variant="danger"
          isInline
          title="Migration submission failed"
          style={{ marginBottom: 16 }}
        >
          <TextContent>
            <Text component="small">
              <ExclamationCircleIcon
                style={{ color: "var(--pf-v5-global--danger-color--100)" }}
              />{" "}
              {status.message}
            </Text>
          </TextContent>
        </Alert>
      )}

      {status.phase === "submitting" && (
        <Alert
          variant="info"
          isInline
          title="Submitting migration..."
          style={{ marginBottom: 16 }}
        >
          <Spinner size="md" /> Creating TaskGroup and submitting to Hub...
        </Alert>
      )}

      {(status.phase === "idle" || status.phase === "error") && (
        <>
          <TextContent>
            <Text component="p">
              Select an agent and a plan to run against{" "}
              <strong>
                {applications.length} application
                {applications.length !== 1 ? "s" : ""}
              </strong>
              :
            </Text>
            <Text component="small">
              {applications.map((a) => a.name).join(", ")}
            </Text>
          </TextContent>

          <Form style={{ marginTop: 16 }}>
            <FormGroup label="Agent" fieldId="agent-select" isRequired>
              <TypeaheadSelect
                placeholderText="Select an agent..."
                toggleId="agent-select-toggle"
                toggleAriaLabel="Agent select"
                ariaLabel="agent"
                value={selectedAgentName}
                options={agentOptions}
                onSelect={(selection) =>
                  setSelectedAgentName(selection ?? "")
                }
              />
            </FormGroup>
            <FormGroup label="Plan" fieldId="plan-select" isRequired>
              <TypeaheadSelect
                placeholderText="Select an agent plan..."
                toggleId="plan-select-toggle"
                toggleAriaLabel="Agent plan select"
                ariaLabel="plan"
                value={selectedPlanName}
                options={planOptions}
                onSelect={(selection) =>
                  setSelectedPlanName(selection ?? "")
                }
              />
            </FormGroup>
            <FormGroup label="Branch" fieldId="branch-input" isRequired>
              <TextInput
                id="branch-input"
                aria-label="Branch"
                placeholder="e.g. migration-output"
                value={branch}
                onChange={(_event, value) => setBranch(value)}
              />
            </FormGroup>
          </Form>

          {(selectedAgent || selectedPlan) && (
            <TextContent style={{ marginTop: 16 }}>
              {selectedAgent && (
                <Text component="small">
                  <strong>Agent:</strong> {selectedAgent.metadata.name}
                  {selectedAgent.spec.model
                    ? ` — model: ${selectedAgent.spec.model}`
                    : ""}
                </Text>
              )}
              {selectedPlan && (
                <Text component="small">
                  <strong>Plan:</strong> {selectedPlan.metadata.name}
                </Text>
              )}
            </TextContent>
          )}

          {agents.length === 0 && (
            <TextContent style={{ marginTop: 16 }}>
              <Text
                component="small"
                style={{
                  color: "var(--pf-v5-global--warning-color--100)",
                }}
              >
                No agents found. Create one in Admin → Agents first.
              </Text>
            </TextContent>
          )}

          {agentPlans.length === 0 && (
            <TextContent style={{ marginTop: 8 }}>
              <Text
                component="small"
                style={{
                  color: "var(--pf-v5-global--warning-color--100)",
                }}
              >
                No agent plans found. Create one in Admin → Agent Plans first.
              </Text>
            </TextContent>
          )}
        </>
      )}
    </Modal>
  );
};

export default MigrateModal;
