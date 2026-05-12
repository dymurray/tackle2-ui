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
  Checkbox,
  ExpandableSection,
  Form,
  FormGroup,
  Text,
  TextContent,
  Title,
} from "@patternfly/react-core";

import type { AgentConfig, New } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import SimpleSelect from "@app/components/FilterToolbar/components/SimpleSelect";
import {
  HookFormPFGroupController,
  HookFormPFTextInput,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import { useFetchAgentRecipes } from "@app/queries/agent-recipes";
import {
  useCreateAgentMutation,
  useFetchAgents,
  useUpdateAgentMutation,
} from "@app/queries/agents";
import { useFetchIdentities } from "@app/queries/identities";
import { duplicateNameCheck, getAxiosErrorMessage } from "@app/utils/utils";

export interface AgentFormValues {
  name: string;
  description?: string;
  recipeIds: number[];
  modelProviderType?: string;
  modelUrl?: string;
  modelName?: string;
  // Stored as the identity id; "" means no identity selected.
  modelIdentityId?: string;
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

  const { existingAgents, recipes, identities, createAgent, updateAgent } =
    useAgentFormData({ onActionSuccess: onClose });

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
        recipeIds: yup.array().of(yup.number().required()).default([]),
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
        modelIdentityId: yup.string(),
      }),
    [t, existingAgents, agent]
  );

  const defaultValues = useMemo<AgentFormValues>(
    () =>
      !agent
        ? {
            name: "",
            description: "",
            recipeIds: [],
            modelProviderType: "",
            modelUrl: "",
            modelName: "",
            modelIdentityId: "",
          }
        : {
            name: agent.name,
            description: agent.description || "",
            recipeIds: agent.recipeIds ?? [],
            modelProviderType: agent.modelConfig?.provider_type || "",
            modelUrl: agent.modelConfig?.url || "",
            modelName: agent.modelConfig?.model || "",
            modelIdentityId: agent.modelConfig?.identity?.id
              ? String(agent.modelConfig.identity.id)
              : "",
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
    const providerType = values.modelProviderType?.trim();
    const url = values.modelUrl?.trim();
    const modelName = values.modelName?.trim();
    const identityId = values.modelIdentityId
      ? Number(values.modelIdentityId)
      : undefined;
    const identity =
      identityId !== undefined
        ? identities.find((i) => i.id === identityId)
        : undefined;
    const hasModelConfig = providerType || url || modelName || identity;

    const payload: New<AgentConfig> = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      recipeIds: values.recipeIds.length > 0 ? values.recipeIds : undefined,
      modelConfig: hasModelConfig
        ? {
            provider_type: providerType || undefined,
            url: url || undefined,
            model: modelName || undefined,
            identity: identity
              ? { id: identity.id, name: identity.name }
              : undefined,
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

        {/* Recipes (multi-select) */}
        <Title headingLevel="h3" size="md" style={{ marginTop: 16 }}>
          Recipes
        </Title>
        <HookFormPFGroupController
          control={control}
          name="recipeIds"
          label=""
          fieldId="agent-recipe-ids"
          renderInput={({ field: { value, onChange } }) => {
            const selected: number[] = Array.isArray(value) ? value : [];
            const toggle = (id: number, checked: boolean) => {
              const next = checked
                ? [...new Set([...selected, id])]
                : selected.filter((s) => s !== id);
              onChange(next);
            };
            if (recipes.length === 0) {
              return (
                <TextContent>
                  <Text component="small">
                    No recipes defined. Create one in Admin → Agent Recipes.
                  </Text>
                </TextContent>
              );
            }
            return (
              <FormGroup
                fieldId="agent-recipe-checkboxes"
                role="group"
                aria-label="Recipes"
              >
                {recipes.map((recipe) => (
                  <Checkbox
                    key={recipe.id}
                    id={`agent-recipe-${recipe.id}`}
                    label={recipe.name}
                    description={recipe.description}
                    isChecked={selected.includes(recipe.id)}
                    onChange={(_event, checked) => toggle(recipe.id, checked)}
                  />
                ))}
              </FormGroup>
            );
          }}
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
          <HookFormPFGroupController
            control={control}
            name="modelIdentityId"
            label="Credentials"
            fieldId="agent-model-identity"
            renderInput={({ field: { value, onChange } }) => {
              const options = identities.map((i) => ({
                value: String(i.id),
                label: `${i.name}${i.kind ? ` (${i.kind})` : ""}`,
              }));
              return (
                <SimpleSelect
                  toggleId="agent-model-identity-toggle"
                  ariaLabel="Credentials"
                  value={value || undefined}
                  options={options}
                  isDisabled={!options.length}
                  onSelect={(selected) => onChange(selected ?? "")}
                />
              );
            }}
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
  const { agentRecipes: recipes, isSuccess: isRecipesSuccess } =
    useFetchAgentRecipes();
  const { identities, isSuccess: isIdentitiesSuccess } = useFetchIdentities();

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
    recipes,
    identities,
    isDataReady: isAgentsSuccess && isRecipesSuccess && isIdentitiesSuccess,
    createAgent,
    updateAgent,
  };
};

export default AgentForm;
