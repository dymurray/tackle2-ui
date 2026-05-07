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
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>({ phase: "idle" });

  const agentOptions: FilterSelectOptionProps[] = (agents || []).map((a) => ({
    value: String(a.id),
    label: `${a.name}${a.modelConfig?.model ? ` (${a.modelConfig.model})` : ""}`,
  }));

  const planOptions: FilterSelectOptionProps[] = (agentPlans || []).map(
    (p) => ({
      value: String(p.id),
      label: p.name,
    })
  );

  const selectedAgent = agents.find((a) => String(a.id) === selectedAgentId);
  const selectedPlan = agentPlans.find((p) => String(p.id) === selectedPlanId);

  const handleClose = () => {
    setStatus({ phase: "idle" });
    setSelectedAgentId("");
    setSelectedPlanId("");
    setBranch("");
    onClose();
  };

  const trimmedBranch = branch.trim();

  const handleSubmit = useCallback(async () => {
    if (!selectedAgent || !selectedPlan || !trimmedBranch) return;
    setStatus({ phase: "submitting" });

    try {
      const taskgroupPayload = {
        name: `migration-${selectedAgent.name}-${Date.now()}`,
        kind: "migration",
        data: {
          agent: {
            name: selectedAgent.name,
            description: selectedAgent.description,
            pallet: selectedAgent.pallet,
            modelConfig: selectedAgent.modelConfig,
          },
          plan: {
            name: selectedPlan.name,
            markdown: selectedPlan.markdown,
          },
          branch: trimmedBranch,
        },
        tasks: applications.map((app) => ({
          name: `${selectedAgent.name}.${app.name}.migration`,
          data: {},
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
      {/* Success state */}
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
            <Text component="small">
              Kind: <code>migration</code> | State: <strong>Ready</strong>
            </Text>
            <Text component="small">
              {applications.length} application(s) queued for migration using
              agent &quot;{selectedAgent?.name}&quot; and plan &quot;
              {selectedPlan?.name}&quot;.
            </Text>
          </TextContent>
        </Alert>
      )}

      {/* Error state */}
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

      {/* Submitting state */}
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

      {/* Form — only show when idle or error */}
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
                value={selectedAgentId}
                options={agentOptions}
                onSelect={(selection) => setSelectedAgentId(selection ?? "")}
              />
            </FormGroup>
            <FormGroup label="Plan" fieldId="plan-select" isRequired>
              <TypeaheadSelect
                placeholderText="Select an agent plan..."
                toggleId="plan-select-toggle"
                toggleAriaLabel="Agent plan select"
                ariaLabel="plan"
                value={selectedPlanId}
                options={planOptions}
                onSelect={(selection) => setSelectedPlanId(selection ?? "")}
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
                  <strong>Agent:</strong> {selectedAgent.name}
                  {selectedAgent.modelConfig?.model
                    ? ` — model: ${selectedAgent.modelConfig.model}`
                    : ""}
                </Text>
              )}
              {selectedPlan && (
                <Text component="small">
                  <strong>Plan:</strong> {selectedPlan.name}
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
