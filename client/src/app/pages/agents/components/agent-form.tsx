import { useMemo } from "react";
import * as React from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as yup from "yup";
import {
  ActionGroup,
  Button,
  ButtonVariant,
  ExpandableSection,
  Form,
} from "@patternfly/react-core";

import type { AgentConfig, New } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import {
  HookFormPFGroupController,
  HookFormPFTextInput,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateAgentMutation,
  useFetchAgents,
  useUpdateAgentMutation,
} from "@app/queries/agents";
import { duplicateNameCheck, getAxiosErrorMessage } from "@app/utils/utils";

import PalletEditor from "./pallet-editor";

export interface AgentFormValues {
  name: string;
  description?: string;
  palletYaml?: string;
  modelProviderType?: string;
  modelUrl?: string;
  modelName?: string;
  modelApiKey?: string;
}

export interface AgentFormProps {
  agent?: AgentConfig | null;
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
          .max(120, t("validation.maxLength", { length: 120 }))
          .test(
            "Duplicate name",
            t("validation.duplicateName", { type: "agent" }),
            (value) =>
              existingAgents
                ? duplicateNameCheck(existingAgents, agent, value ?? "")
                : false
          ),
        description: yup
          .string()
          .trim()
          .max(250, t("validation.maxLength", { length: 250 })),
        palletYaml: yup.string().trim(),
        modelProviderType: yup
          .string()
          .trim()
          .max(60, t("validation.maxLength", { length: 60 })),
        modelUrl: yup
          .string()
          .trim()
          .max(500, t("validation.maxLength", { length: 500 })),
        modelName: yup
          .string()
          .trim()
          .max(120, t("validation.maxLength", { length: 120 })),
        modelApiKey: yup
          .string()
          .trim()
          .max(500, t("validation.maxLength", { length: 500 })),
      }),
    [t, existingAgents, agent]
  );

  const defaultValues = useMemo(
    () =>
      !agent
        ? {
            name: "",
            description: "",
            palletYaml: "",
            modelProviderType: "",
            modelUrl: "",
            modelName: "",
            modelApiKey: "",
          }
        : {
            name: agent.name,
            description: agent.description || "",
            palletYaml: agent.pallet?.yaml || "",
            modelProviderType: agent.modelConfig?.provider_type || "",
            modelUrl: agent.modelConfig?.url || "",
            modelName: agent.modelConfig?.model || "",
            modelApiKey: agent.modelConfig?.api_key || "",
          },
    [agent]
  );

  const formMethods = useForm<AgentFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: AgentFormValues) => {
    const providerType = values.modelProviderType?.trim();
    const url = values.modelUrl?.trim();
    const modelName = values.modelName?.trim();
    const apiKey = values.modelApiKey?.trim();
    const hasModelConfig = providerType || url || modelName || apiKey;

    const payload: New<AgentConfig> = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      pallet: values.palletYaml?.trim()
        ? { yaml: values.palletYaml.trim() }
        : undefined,
      modelConfig: hasModelConfig
        ? {
            provider_type: providerType || undefined,
            url: url || undefined,
            model: modelName || undefined,
            api_key: apiKey || undefined,
          }
        : undefined,
    };

    if (agent) {
      updateAgent({
        id: agent.id,
        ...payload,
      });
    } else {
      createAgent(payload);
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
        />

        <HookFormPFTextInput
          control={control}
          name="description"
          label={t("terms.description")}
          fieldId="agent-description"
        />

        {/* Pallet Configuration — heading is rendered by PalletEditor */}
        <HookFormPFGroupController
          control={control}
          name="palletYaml"
          label=""
          fieldId="agent-pallet-yaml"
          renderInput={({ field: { value, onChange } }) => (
            <PalletEditor
              value={value || ""}
              onChange={(val) => onChange(val)}
            />
          )}
        />

        {/* Model Configuration (optional) */}
        <ExpandableSection
          toggleText="Model configuration (optional)"
          toggleId="agent-model-config-toggle"
          contentId="agent-model-config-content"
        >
          <HookFormPFTextInput
            control={control}
            name="modelProviderType"
            label="Provider type"
            fieldId="agent-model-provider-type"
            placeholder="e.g. openai, anthropic, ollama"
          />
          <HookFormPFTextInput
            control={control}
            name="modelUrl"
            label="Provider URL"
            fieldId="agent-model-url"
            placeholder="https://api.openai.com"
          />
          <HookFormPFTextInput
            control={control}
            name="modelName"
            label="Model name"
            fieldId="agent-model-name"
            placeholder="e.g. gpt-4o"
          />
          <HookFormPFTextInput
            control={control}
            name="modelApiKey"
            label="API key"
            fieldId="agent-model-api-key"
            type="password"
          />
        </ExpandableSection>

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
  onActionFail,
}: {
  onActionSuccess?: () => void;
  onActionFail?: () => void;
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

  const onUpdateSuccess = (_id: number) => {
    pushNotification({
      title: t("toastr.success.save", {
        type: "agent",
      }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onCreateUpdateError = (error: AxiosError) => {
    pushNotification({
      title: getAxiosErrorMessage(error),
      variant: "danger",
    });
    onActionFail?.();
  };

  const { mutate: createAgent } = useCreateAgentMutation(
    onCreateSuccess,
    onCreateUpdateError
  );

  const { mutate: updateAgent } = useUpdateAgentMutation(
    onUpdateSuccess,
    onCreateUpdateError
  );

  return {
    existingAgents,
    isDataReady: isAgentsSuccess,
    createAgent,
    updateAgent,
  };
};

export default AgentForm;
