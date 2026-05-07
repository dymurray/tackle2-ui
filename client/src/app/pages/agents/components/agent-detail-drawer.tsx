import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Tab,
  TabTitleText,
  Tabs,
  Text,
  TextContent,
  Title,
} from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import { AgentConfig } from "@app/api/models";
import { PageDrawerContent } from "@app/components/PageDrawerContext";
import { useFetchAgentRecipes } from "@app/queries/agent-recipes";

export interface IAgentDetailDrawerProps {
  onCloseClick: () => void;
  agent: AgentConfig | null;
}

enum TabKey {
  Details = 0,
  Recipes,
  Model,
}

const AgentDetailDrawer: React.FC<IAgentDetailDrawerProps> = ({
  onCloseClick,
  agent,
}) => {
  const { t } = useTranslation();

  const [activeTabKey, setActiveTabKey] = React.useState<TabKey>(
    TabKey.Details
  );

  return (
    <PageDrawerContent
      isExpanded={!!agent}
      onCloseClick={onCloseClick}
      focusKey={agent?.id}
      pageKey="agent-details"
      header={
        <TextContent>
          <Text component="small" className={spacing.mb_0}>
            Agent Details
          </Text>
          <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
            {agent?.name}
          </Title>
        </TextContent>
      }
    >
      <div>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_event, tabKey) => setActiveTabKey(tabKey as TabKey)}
        >
          <Tab
            eventKey={TabKey.Details}
            title={<TabTitleText>{t("terms.details")}</TabTitleText>}
          >
            <DetailsTab agent={agent} />
          </Tab>
          <Tab
            eventKey={TabKey.Recipes}
            title={<TabTitleText>Recipes</TabTitleText>}
          >
            <RecipesTab agent={agent} />
          </Tab>
          <Tab
            eventKey={TabKey.Model}
            title={<TabTitleText>Model</TabTitleText>}
          >
            <ModelTab agent={agent} />
          </Tab>
        </Tabs>
      </div>
    </PageDrawerContent>
  );
};

export default AgentDetailDrawer;

const DetailsTab: React.FC<{ agent: AgentConfig | null }> = ({ agent }) => {
  const { t } = useTranslation();

  if (!agent) {
    return null;
  }

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>{t("terms.name")}</DescriptionListTerm>
        <DescriptionListDescription>{agent.name}</DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>{t("terms.description")}</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.description || t("terms.notAvailable")}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const RecipesTab: React.FC<{ agent: AgentConfig | null }> = ({ agent }) => {
  const { agentRecipes } = useFetchAgentRecipes();

  if (!agent) return null;
  const ids = agent.recipeIds ?? [];
  if (ids.length === 0) {
    return <Text component="small">No recipes assigned.</Text>;
  }

  const selected = agentRecipes.filter((r) => ids.includes(r.id));
  const missing = ids.filter((id) => !agentRecipes.some((r) => r.id === id));

  return (
    <DescriptionList>
      {selected.map((recipe) => (
        <DescriptionListGroup key={recipe.id}>
          <DescriptionListTerm>{recipe.name}</DescriptionListTerm>
          <DescriptionListDescription>
            {recipe.description || (
              <Text component="small">No description</Text>
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
      {missing.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Missing recipes</DescriptionListTerm>
          <DescriptionListDescription>
            <Text component="small">
              Referenced recipe id(s) not found: {missing.join(", ")}
            </Text>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );
};

const ModelTab: React.FC<{ agent: AgentConfig | null }> = ({ agent }) => {
  const { t } = useTranslation();

  if (!agent?.modelConfig) {
    return <Text component="small">No model configuration defined.</Text>;
  }

  const { provider_type, url, model, api_key } = agent.modelConfig;

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>Provider type</DescriptionListTerm>
        <DescriptionListDescription>
          {provider_type || t("terms.notAvailable")}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Provider URL</DescriptionListTerm>
        <DescriptionListDescription>
          {url || t("terms.notAvailable")}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>Model</DescriptionListTerm>
        <DescriptionListDescription>
          {model || t("terms.notAvailable")}
        </DescriptionListDescription>
      </DescriptionListGroup>

      <DescriptionListGroup>
        <DescriptionListTerm>API key</DescriptionListTerm>
        <DescriptionListDescription>
          {api_key ? "••••••" : t("terms.notAvailable")}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};
