import * as React from "react";
import { useMemo } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as yup from "yup";
import {
  ActionGroup,
  Button,
  ButtonVariant,
  Form,
} from "@patternfly/react-core";

import type { Agent } from "@app/api/k8s-models";
import { ConditionalRender } from "@app/components/ConditionalRender";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import {
  HookFormPFTextInput,
  HookFormPFTextArea,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useFetchAgents,
} from "@app/queries/agents";
import { getAxiosErrorMessage } from "@app/utils/utils";

interface AgentFormValues {
  name: string;
  description: string;
  prompt: string;
  containerImage: string;
  model: string;
  llmProviderRef: string;
}

export interface AgentFormProps {
  agent?: Agent | null;
  onClose: () => void;
}

export const AgentForm: React.FC<AgentFormProps> = ({ ...rest }) => {
  const { isDataReady } = useAgentFormData();
  return (
    <ConditionalRender when={!isDataReady} then={<AppPlaceholder />}>
      <AgentFormRenderer {...rest} />
    </ConditionalRender>
  );
};

const AgentFormRenderer: React.FC<AgentFormProps> = ({
  agent = null,
  onClose,
}) => {
  const { t } = useTranslation();
  const { existingAgents, createAgent, updateAgent } = useAgentFormData({
    onActionSuccess: onClose,
  });

  const validationSchema = useMemo(
    () =>
      yup.object().shape({
        name: yup
          .string()
          .trim()
          .required(t("validation.required"))
          .min(3, t("validation.minLength", { length: 3 }))
          .max(63, "Must be 63 characters or less")
          .matches(
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
            "Must be lowercase, alphanumeric, may contain hyphens"
          )
          .test("Duplicate name", "An agent with this name already exists", (value) =>
            agent
              ? true
              : !existingAgents.some((a) => a.metadata.name === value)
          ),
        description: yup.string().trim().required(t("validation.required")),
        prompt: yup.string().trim(),
        containerImage: yup.string().trim(),
        model: yup.string().trim(),
        llmProviderRef: yup.string().trim(),
      }),
    [t, existingAgents, agent]
  );

  const defaultValues = useMemo<AgentFormValues>(
    () =>
      !agent
        ? {
            name: "",
            description: "",
            prompt: "",
            containerImage: "",
            model: "",
            llmProviderRef: "",
          }
        : {
            name: agent.metadata.name,
            description: agent.spec.description || "",
            prompt: agent.spec.prompt || "",
            containerImage: agent.spec.containerImage || "",
            model: agent.spec.model || "",
            llmProviderRef: agent.spec.llmProviderRef?.name || "",
          },
    [agent]
  );

  const formMethods = useForm<AgentFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema) as never,
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: AgentFormValues) => {
    const resource: Omit<Agent, "status"> = {
      apiVersion: "konveyor.io/v1alpha1",
      kind: "Agent",
      metadata: {
        name: values.name,
        ...(agent?.metadata.namespace && {
          namespace: agent.metadata.namespace,
        }),
        ...(agent?.metadata.resourceVersion && {
          resourceVersion: agent.metadata.resourceVersion,
        }),
      },
      spec: {
        description: values.description,
        prompt: values.prompt || undefined,
        containerImage: values.containerImage || undefined,
        model: values.model || undefined,
        llmProviderRef: values.llmProviderRef
          ? { name: values.llmProviderRef }
          : undefined,
        skillCardRefs: agent?.spec.skillCardRefs,
        skillCollectionRefs: agent?.spec.skillCollectionRefs,
        subagentRefs: agent?.spec.subagentRefs,
      },
    };

    if (agent) {
      updateAgent(resource as Agent);
    } else {
      createAgent(resource);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <Form onSubmit={handleSubmit(onValidSubmit)} id="agent-form">
        <HookFormPFTextInput
          control={control}
          name="name"
          label={t("terms.name")}
          fieldId="agent-name"
          isRequired
          isDisabled={!!agent}
        />
        <HookFormPFTextInput
          control={control}
          name="description"
          label={t("terms.description")}
          fieldId="agent-description"
          isRequired
        />
        <HookFormPFTextArea
          control={control}
          name="prompt"
          label="Prompt"
          fieldId="agent-prompt"
        />
        <HookFormPFTextInput
          control={control}
          name="containerImage"
          label="Container Image"
          fieldId="agent-container-image"
          placeholder="e.g. quay.io/konveyor/agent:latest"
        />
        <HookFormPFTextInput
          control={control}
          name="llmProviderRef"
          label="LLM Provider"
          fieldId="agent-llm-provider"
          placeholder="Name of an LLMProvider resource"
        />
        <HookFormPFTextInput
          control={control}
          name="model"
          label="Model"
          fieldId="agent-model"
          placeholder="e.g. gpt-4o"
        />

        <ActionGroup>
          <Button
            type="submit"
            id="submit"
            aria-label="submit"
            variant={ButtonVariant.primary}
            isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
          >
            {!agent ? t("actions.create") : t("actions.save")}
          </Button>
          <Button
            type="button"
            id="cancel"
            aria-label="cancel"
            variant={ButtonVariant.link}
            isDisabled={isSubmitting || isValidating}
            onClick={onClose}
          >
            {t("actions.cancel")}
          </Button>
        </ActionGroup>
      </Form>
    </FormProvider>
  );
};

const useAgentFormData = ({
  onActionSuccess,
}: {
  onActionSuccess?: () => void;
} = {}) => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { agents: existingAgents, isSuccess: isAgentsSuccess } =
    useFetchAgents();

  const onCreateSuccess = () => {
    pushNotification({
      title: t("toastr.success.createWhat", {
        type: t("terms.new"),
        what: "agent",
      }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onUpdateSuccess = (_name: string) => {
    pushNotification({
      title: t("toastr.success.save", { type: "agent" }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onError = (error: AxiosError) => {
    pushNotification({
      title: getAxiosErrorMessage(error),
      variant: "danger",
    });
  };

  const { mutate: createAgent } = useCreateAgentMutation(
    onCreateSuccess,
    onError
  );

  const { mutate: updateAgent } = useUpdateAgentMutation(
    onUpdateSuccess,
    onError
  );

  return {
    existingAgents,
    isDataReady: isAgentsSuccess,
    createAgent,
    updateAgent,
  };
};

export default AgentForm;
