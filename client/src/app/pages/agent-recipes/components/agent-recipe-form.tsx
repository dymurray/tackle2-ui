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

import type { AgentRecipe, New } from "@app/api/models";
import { AppPlaceholder } from "@app/components/AppPlaceholder";
import { ConditionalRender } from "@app/components/ConditionalRender";
import {
  HookFormPFGroupController,
  HookFormPFTextInput,
} from "@app/components/HookFormPFFields";
import { NotificationsContext } from "@app/components/NotificationsContext";
import {
  useCreateAgentRecipeMutation,
  useFetchAgentRecipes,
  useUpdateAgentRecipeMutation,
} from "@app/queries/agent-recipes";
import { duplicateNameCheck, getAxiosErrorMessage } from "@app/utils/utils";

import PalletEditor from "./pallet-editor";

export interface AgentRecipeFormValues {
  name: string;
  description?: string;
  yaml: string;
}

export interface AgentRecipeFormProps {
  recipe?: AgentRecipe | null;
  onClose: () => void;
}

export const AgentRecipeForm: React.FC<AgentRecipeFormProps> = ({
  ...rest
}) => {
  const { isDataReady } = useAgentRecipeFormData();
  return (
    <ConditionalRender when={!isDataReady} then={<AppPlaceholder />}>
      <AgentRecipeFormRenderer {...rest} />
    </ConditionalRender>
  );
};

const AgentRecipeFormRenderer: React.FC<AgentRecipeFormProps> = ({
  recipe = null,
  onClose,
}) => {
  const { t } = useTranslation();

  const { existingRecipes, createRecipe, updateRecipe } =
    useAgentRecipeFormData({ onActionSuccess: onClose });

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
            t("validation.duplicateName", { type: "agent recipe" }),
            (value) =>
              existingRecipes
                ? duplicateNameCheck(existingRecipes, recipe, value ?? "")
                : false
          ),
        description: yup
          .string()
          .trim()
          .max(250, t("validation.maxLength", { length: 250 })),
        yaml: yup.string().required(t("validation.required")),
      }),
    [t, existingRecipes, recipe]
  );

  const defaultValues = useMemo(
    () =>
      !recipe
        ? { name: "", description: "", yaml: "" }
        : {
            name: recipe.name,
            description: recipe.description || "",
            yaml: recipe.yaml || "",
          },
    [recipe]
  );

  const formMethods = useForm<AgentRecipeFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
    mode: "all",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, isValidating, isValid, isDirty },
    control,
  } = formMethods;

  const onValidSubmit = (values: AgentRecipeFormValues) => {
    const payload: New<AgentRecipe> = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      yaml: values.yaml,
    };

    if (recipe) {
      updateRecipe({ id: recipe.id, ...payload });
    } else {
      createRecipe(payload);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <Form onSubmit={handleSubmit(onValidSubmit)} id="agent-recipe-form">
        <HookFormPFTextInput
          control={control}
          name="name"
          label={t("terms.name")}
          fieldId="agent-recipe-name"
          isRequired
        />

        <HookFormPFTextInput
          control={control}
          name="description"
          label={t("terms.description")}
          fieldId="agent-recipe-description"
        />

        <HookFormPFGroupController
          control={control}
          name="yaml"
          label=""
          fieldId="agent-recipe-yaml"
          renderInput={({ field: { value, onChange } }) => (
            <PalletEditor
              value={value || ""}
              onChange={(val) => onChange(val)}
            />
          )}
        />

        <ActionGroup>
          <Button
            type="submit"
            id="submit"
            aria-label="submit"
            variant={ButtonVariant.primary}
            isDisabled={!isValid || isSubmitting || isValidating || !isDirty}
          >
            {!recipe ? t("actions.create") : t("actions.save")}
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

const useAgentRecipeFormData = ({
  onActionSuccess,
  onActionFail,
}: {
  onActionSuccess?: () => void;
  onActionFail?: () => void;
} = {}) => {
  const { t } = useTranslation();
  const { pushNotification } = React.useContext(NotificationsContext);

  const { agentRecipes: existingRecipes, isSuccess: isRecipesSuccess } =
    useFetchAgentRecipes();

  const onCreateSuccess = () => {
    pushNotification({
      title: t("toastr.success.createWhat", {
        type: t("terms.new"),
        what: "agent recipe",
      }),
      variant: "success",
    });
    onActionSuccess?.();
  };

  const onUpdateSuccess = (_id: number) => {
    pushNotification({
      title: t("toastr.success.save", { type: "agent recipe" }),
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

  const { mutate: createRecipe } = useCreateAgentRecipeMutation(
    onCreateSuccess,
    onCreateUpdateError
  );

  const { mutate: updateRecipe } = useUpdateAgentRecipeMutation(
    onUpdateSuccess,
    onCreateUpdateError
  );

  return {
    existingRecipes,
    isDataReady: isRecipesSuccess,
    createRecipe,
    updateRecipe,
  };
};

export default AgentRecipeForm;
