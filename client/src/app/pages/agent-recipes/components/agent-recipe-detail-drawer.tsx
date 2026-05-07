import * as React from "react";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Text,
  TextContent,
  Title,
} from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import { AgentRecipe } from "@app/api/models";
import { PageDrawerContent } from "@app/components/PageDrawerContext";

export interface IAgentRecipeDetailDrawerProps {
  onCloseClick: () => void;
  recipe: AgentRecipe | null;
}

const AgentRecipeDetailDrawer: React.FC<IAgentRecipeDetailDrawerProps> = ({
  onCloseClick,
  recipe,
}) => {
  return (
    <PageDrawerContent
      isExpanded={!!recipe}
      onCloseClick={onCloseClick}
      focusKey={recipe?.id}
      pageKey="agent-recipe-details"
      header={
        <TextContent>
          <Text component="small" className={spacing.mb_0}>
            Agent Recipe
          </Text>
          <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
            {recipe?.name}
          </Title>
        </TextContent>
      }
    >
      {recipe && (
        <DescriptionList>
          {recipe.description && (
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {recipe.description}
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm>Pallet YAML</DescriptionListTerm>
            <DescriptionListDescription>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 400,
                  overflow: "auto",
                  background: "var(--pf-v5-global--BackgroundColor--200)",
                  padding: "var(--pf-v5-global--spacer--sm)",
                  borderRadius: 4,
                  fontSize: "0.85em",
                }}
              >
                {recipe.yaml || "—"}
              </pre>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      )}
    </PageDrawerContent>
  );
};

export default AgentRecipeDetailDrawer;
