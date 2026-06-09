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
  Form,
} from "@patternfly/react-core";

import type { AgentPlan } from "@app/api/k8s-models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import {
  HookFormPFTextArea,
  HookFormPFTextInput,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateAgentPlanMutation,
  useFetchAgentPlans,
  useUpdateAgentPlanMutation,
} from "@app/queries/agent-plans";
import { getAxiosErrorMessage } from "@app/utils/utils";

interface AgentPlanFormValues {
  name: string;
  description: string;
  guide: string;
}

export interface AgentPlanFormProps {
  plan?: AgentPlan | null;
  onClose: () => void;
}

export const AgentPlanForm: React.FC<AgentPlanFormProps> = ({ ...rest }) => {
  const { isDataReady } = useAgentPlanFormData();
  return (
    <ConditionalRender when={!isDataReady} then={<AppPlaceholder />}>
      <AgentPlanFormRenderer {...rest} />
    </ConditionalRender>
  );
};

const AgentPlanFormRenderer: React.FC<AgentPlanFormProps> = ({
  plan = null,
  onClose,
}) => {
  const { t } = useTranslation();
  const { existingPlans, createPlan, updatePlan } = useAgentPlanFormData({
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
          .test(
            "Duplicate name",
            "An agent plan with this name already exists",
            (value) =>
              plan
                ? true
                : !existingPlans.some((p) => p.metadata.name === value)
          ),
        description: yup.string().trim().required(t("validation.required")),
        guide: yup.string(),
      }),
    [t, existingPlans, plan]
  );

  const defaultValues = useMemo(
    () =>
      !plan
        ? { name: "", description: "", guide: "" }
        : {
            name: plan.metadata.name,
            description: plan.spec.description || "",
            guide: plan.spec.guide || "",
          },
    [plan]
  );

  const formMethods = useForm<AgentPlanFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema) as never,
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: AgentPlanFormValues) => {
    const resource: Omit<AgentPlan, "status"> = {
      apiVersion: "konveyor.io/v1alpha1",
      kind: "AgentPlan",
      metadata: {
        name: values.name,
        ...(plan?.metadata.namespace && {
          namespace: plan.metadata.namespace,
        }),
        ...(plan?.metadata.resourceVersion && {
          resourceVersion: plan.metadata.resourceVersion,
        }),
      },
      spec: {
        description: values.description,
        guide: values.guide || undefined,
        stages: plan?.spec.stages,
      },
    };

    if (plan) {
      updatePlan(resource as AgentPlan);
    } else {
      createPlan(resource);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <Form onSubmit={handleSubmit(onValidSubmit)} id="agent-plan-form">
        <HookFormPFTextInput
          control={control}
          name="name"
          label={t("terms.name")}
          fieldId="agent-plan-name"
          isRequired
          isDisabled={!!plan}
        />
        <HookFormPFTextInput
          control={control}
          name="description"
          label={t("terms.description")}
          fieldId="agent-plan-description"
          isRequired
        />
        <HookFormPFTextArea
          control={control}
          name="guide"
          label="Guide"
          fieldId="agent-plan-guide"
          resizeOrientation="vertical"
          rows={12}
          placeholder={
            "# Migration Guide\n\nHigh-level overview of the plan..."
          }
          style={{
            fontFamily:
              "var(--pf-v5-global--FontFamily--monospace, monospace)",
            fontSize: "0.9em",
          }}
        />

        <ActionGroup>
          <Button
            type="submit"
            id="submit"
            aria-label="submit"
            variant={ButtonVariant.primary}
            isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
          >
            {!plan ? t("actions.create") : t("actions.save")}
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

const useAgentPlanFormData = ({
  onActionSuccess,
}: {
  onActionSuccess?: () => void;
} = {}) => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { agentPlans: existingPlans, isSuccess: isPlansSuccess } =
    useFetchAgentPlans();

  const onCreateSuccess = () => {
    pushNotification({
      title: t("toastr.success.createWhat", {
        type: t("terms.new"),
        what: "agent plan",
      }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onUpdateSuccess = (_name: string) => {
    pushNotification({
      title: t("toastr.success.save", { type: "agent plan" }),
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

  const { mutate: createPlan } = useCreateAgentPlanMutation(
    onCreateSuccess,
    onError
  );

  const { mutate: updatePlan } = useUpdateAgentPlanMutation(
    onUpdateSuccess,
    onError
  );

  return {
    existingPlans,
    isDataReady: isPlansSuccess,
    createPlan,
    updatePlan,
  };
};

export default AgentPlanForm;
