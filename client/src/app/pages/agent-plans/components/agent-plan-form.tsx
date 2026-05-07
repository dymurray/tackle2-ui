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

import type { AgentPlan, New } from "@app/api/models";
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
import { duplicateNameCheck, getAxiosErrorMessage } from "@app/utils/utils";

export interface AgentPlanFormValues {
  name: string;
  markdown: string;
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
          .max(120, t("validation.maxLength", { length: 120 }))
          .test(
            "Duplicate name",
            t("validation.duplicateName", { type: "agent plan" }),
            (value) =>
              existingPlans
                ? duplicateNameCheck(existingPlans, plan, value ?? "")
                : false
          ),
        markdown: yup.string().required(t("validation.required")),
      }),
    [t, existingPlans, plan]
  );

  const defaultValues = useMemo(
    () =>
      !plan
        ? { name: "", markdown: "" }
        : { name: plan.name, markdown: plan.markdown ?? "" },
    [plan]
  );

  const formMethods = useForm<AgentPlanFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: AgentPlanFormValues) => {
    const payload: New<AgentPlan> = {
      name: values.name.trim(),
      markdown: values.markdown,
    };

    if (plan) {
      updatePlan({ id: plan.id, ...payload });
    } else {
      createPlan(payload);
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
        />

        <HookFormPFTextArea
          control={control}
          name="markdown"
          label="Markdown"
          fieldId="agent-plan-markdown"
          isRequired
          resizeOrientation="vertical"
          rows={20}
          placeholder={"# Plan title\n\nSteps the agent should follow..."}
          style={{
            fontFamily: "var(--pf-v5-global--FontFamily--monospace, monospace)",
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
  onActionFail,
}: {
  onActionSuccess?: () => void;
  onActionFail?: () => void;
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

  const onUpdateSuccess = (_id: number) => {
    pushNotification({
      title: t("toastr.success.save", { type: "agent plan" }),
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

  const { mutate: createPlan } = useCreateAgentPlanMutation(
    onCreateSuccess,
    onCreateUpdateError
  );

  const { mutate: updatePlan } = useUpdateAgentPlanMutation(
    onUpdateSuccess,
    onCreateUpdateError
  );

  return {
    existingPlans,
    isDataReady: isPlansSuccess,
    createPlan,
    updatePlan,
  };
};

export default AgentPlanForm;
