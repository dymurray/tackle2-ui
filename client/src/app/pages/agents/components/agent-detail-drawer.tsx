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

export interface IAgentDetailDrawerProps {
  onCloseClick: () => void;
  agent: AgentConfig | null;
}

enum TabKey {
  Details = 0,
  Pallet,
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
            eventKey={TabKey.Pallet}
            title={<TabTitleText>Pallet</TabTitleText>}
          >
            <PalletTab agent={agent} />
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

const PalletTab: React.FC<{ agent: AgentConfig | null }> = ({ agent }) => {
  if (!agent?.pallet) {
    return <Text component="small">No pallet configuration defined.</Text>;
  }

  return (
    <DescriptionList>
      {agent.pallet.archetype && (
        <DescriptionListGroup>
          <DescriptionListTerm>Archetype</DescriptionListTerm>
          <DescriptionListDescription>
            {agent.pallet.archetype.name}
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {agent.pallet.skills && agent.pallet.skills.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Skills</DescriptionListTerm>
          <DescriptionListDescription>
            {agent.pallet.skills.join(", ")}
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}

      {agent.pallet.yaml && (
        <DescriptionListGroup>
          <DescriptionListTerm>Pallet YAML</DescriptionListTerm>
          <DescriptionListDescription>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 300,
                overflow: "auto",
                background: "var(--pf-v5-global--BackgroundColor--200)",
                padding: "var(--pf-v5-global--spacer--sm)",
                borderRadius: 4,
                fontSize: "0.85em",
              }}
            >
              {agent.pallet.yaml}
            </pre>
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
