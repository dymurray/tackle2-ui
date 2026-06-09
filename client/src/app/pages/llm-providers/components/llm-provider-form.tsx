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

import type { LLMProvider } from "@app/api/k8s-models";
import {
  HookFormPFTextInput,
  HookFormPFTextArea,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateLLMProviderMutation,
  useUpdateLLMProviderMutation,
  useFetchLLMProviders,
} from "@app/queries/llmproviders";
import { getAxiosErrorMessage } from "@app/utils/utils";

interface LLMProviderFormValues {
  name: string;
  description: string;
  url: string;
  provider: string;
  models: string;
  credentialSecret: string;
  credentialKey: string;
}

export interface LLMProviderFormProps {
  llmProvider?: LLMProvider | null;
  onClose: () => void;
}

export const LLMProviderForm: React.FC<LLMProviderFormProps> = ({
  ...rest
}) => {
  return <LLMProviderFormRenderer {...rest} />;
};

const LLMProviderFormRenderer: React.FC<LLMProviderFormProps> = ({
  llmProvider = null,
  onClose,
}) => {
  const { t } = useTranslation();
  const { existingProviders, createProvider, updateProvider } =
    useLLMProviderFormData({ onActionSuccess: onClose });

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
          .test(
            "Duplicate name",
            "A provider with this name already exists",
            (value) =>
              llmProvider
                ? true
                : !existingProviders.some((p) => p.metadata.name === value)
          ),
        description: yup.string().trim().required(t("validation.required")),
        url: yup.string().trim().required(t("validation.required")),
        provider: yup.string().trim(),
        models: yup.string().trim(),
        credentialSecret: yup.string().trim(),
        credentialKey: yup.string().trim(),
      }),
    [t, existingProviders, llmProvider]
  );

  const defaultValues = useMemo<LLMProviderFormValues>(
    () =>
      !llmProvider
        ? {
            name: "",
            description: "",
            url: "",
            provider: "",
            models: "",
            credentialSecret: "",
            credentialKey: "",
          }
        : {
            name: llmProvider.metadata.name,
            description: llmProvider.spec.description || "",
            url: llmProvider.spec.url || "",
            provider: llmProvider.spec.provider || "",
            models:
              llmProvider.spec.models?.map((m) => m.name).join(", ") || "",
            credentialSecret:
              llmProvider.spec.credentialsSecretRef?.name || "",
            credentialKey: llmProvider.spec.credentialsSecretRef?.key || "",
          },
    [llmProvider]
  );

  const formMethods = useForm<LLMProviderFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema) as never,
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: LLMProviderFormValues) => {
    const models = values.models
      ? values.models
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean)
          .map((name) => {
            const existing = llmProvider?.spec.models?.find(
              (em) => em.name === name
            );
            return existing || { name };
          })
      : undefined;

    const resource: Omit<LLMProvider, "status"> = {
      apiVersion: "konveyor.io/v1alpha1",
      kind: "LLMProvider",
      metadata: {
        name: values.name,
        ...(llmProvider?.metadata.namespace && {
          namespace: llmProvider.metadata.namespace,
        }),
        ...(llmProvider?.metadata.resourceVersion && {
          resourceVersion: llmProvider.metadata.resourceVersion,
        }),
      },
      spec: {
        description: values.description,
        url: values.url,
        provider: values.provider || undefined,
        models: models,
        credentialsSecretRef: values.credentialSecret
          ? {
              name: values.credentialSecret,
              key: values.credentialKey || undefined,
            }
          : undefined,
      },
    };

    if (llmProvider) {
      updateProvider(resource as LLMProvider);
    } else {
      createProvider(resource);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <Form onSubmit={handleSubmit(onValidSubmit)} id="llm-provider-form">
        <HookFormPFTextInput
          control={control}
          name="name"
          label={t("terms.name")}
          fieldId="llm-provider-name"
          isRequired
          isDisabled={!!llmProvider}
        />
        <HookFormPFTextInput
          control={control}
          name="description"
          label={t("terms.description")}
          fieldId="llm-provider-description"
          isRequired
        />
        <HookFormPFTextInput
          control={control}
          name="url"
          label="URL"
          fieldId="llm-provider-url"
          isRequired
          placeholder="e.g. https://api.openai.com/v1"
        />
        <HookFormPFTextInput
          control={control}
          name="provider"
          label="Provider"
          fieldId="llm-provider-provider"
          placeholder="e.g. openai, ollama, azure"
        />
        <HookFormPFTextInput
          control={control}
          name="models"
          label="Models (comma-separated)"
          fieldId="llm-provider-models"
          placeholder="e.g. gpt-4o, gpt-4o-mini"
        />
        <HookFormPFTextInput
          control={control}
          name="credentialSecret"
          label="Credentials Secret"
          fieldId="llm-provider-secret"
          placeholder="Name of a K8s Secret"
        />
        <HookFormPFTextInput
          control={control}
          name="credentialKey"
          label="Credentials Key"
          fieldId="llm-provider-secret-key"
          placeholder="Key within the Secret (e.g. api-key)"
        />

        <ActionGroup>
          <Button
            type="submit"
            id="submit"
            aria-label="submit"
            variant={ButtonVariant.primary}
            isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
          >
            {!llmProvider ? t("actions.create") : t("actions.save")}
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

const useLLMProviderFormData = ({
  onActionSuccess,
}: {
  onActionSuccess?: () => void;
} = {}) => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { llmProviders: existingProviders, isSuccess } =
    useFetchLLMProviders();

  const onCreateSuccess = () => {
    pushNotification({
      title: t("toastr.success.createWhat", {
        type: t("terms.new"),
        what: "LLM provider",
      }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onUpdateSuccess = (_name: string) => {
    pushNotification({
      title: t("toastr.success.save", { type: "LLM provider" }),
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

  const { mutate: createProvider } = useCreateLLMProviderMutation(
    onCreateSuccess,
    onError
  );

  const { mutate: updateProvider } = useUpdateLLMProviderMutation(
    onUpdateSuccess,
    onError
  );

  return {
    existingProviders,
    isDataReady: isSuccess,
    createProvider,
    updateProvider,
  };
};

export default LLMProviderForm;
