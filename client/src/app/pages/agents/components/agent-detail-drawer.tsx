import * as React from "react";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
  Tab,
  TabTitleText,
  Tabs,
  Text,
  TextContent,
  Title,
} from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import type { Agent } from "@app/api/k8s-models";
import { PageDrawerContent } from "@app/components/PageDrawerContext";

export interface IAgentDetailDrawerProps {
  onCloseClick: () => void;
  agent: Agent | null;
}

enum TabKey {
  Details = 0,
  Skills,
}

const AgentDetailDrawer: React.FC<IAgentDetailDrawerProps> = ({
  onCloseClick,
  agent,
}) => {
  const [activeTabKey, setActiveTabKey] = React.useState<TabKey>(
    TabKey.Details
  );

  return (
    <PageDrawerContent
      isExpanded={!!agent}
      onCloseClick={onCloseClick}
      focusKey={agent?.metadata.name}
      pageKey="agent-details"
      header={
        <TextContent>
          <Text component="small" className={spacing.mb_0}>
            Agent Details
          </Text>
          <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
            {agent?.metadata.name}
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
            title={<TabTitleText>Details</TabTitleText>}
          >
            <DetailsTab agent={agent} />
          </Tab>
          <Tab
            eventKey={TabKey.Skills}
            title={<TabTitleText>Skills</TabTitleText>}
          >
            <SkillsTab agent={agent} />
          </Tab>
        </Tabs>
      </div>
    </PageDrawerContent>
  );
};

export default AgentDetailDrawer;

const DetailsTab: React.FC<{ agent: Agent | null }> = ({ agent }) => {
  if (!agent) return null;

  return (
    <DescriptionList>
      <DescriptionListGroup>
        <DescriptionListTerm>Name</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.metadata.name}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Description</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.spec.description || "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>LLM Provider</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.spec.llmProviderRef?.name || "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Model</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.spec.model || "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Container Image</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.spec.containerImage || "—"}
        </DescriptionListDescription>
      </DescriptionListGroup>
      {agent.spec.prompt && (
        <DescriptionListGroup>
          <DescriptionListTerm>Prompt</DescriptionListTerm>
          <DescriptionListDescription>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85em" }}>
              {agent.spec.prompt}
            </pre>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
      <DescriptionListGroup>
        <DescriptionListTerm>Status</DescriptionListTerm>
        <DescriptionListDescription>
          {agent.status?.ready ? (
            <Label color="green">Ready</Label>
          ) : (
            <Label color="grey">Pending</Label>
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};

const SkillsTab: React.FC<{ agent: Agent | null }> = ({ agent }) => {
  if (!agent) return null;

  const skillCards = agent.spec.skillCardRefs ?? [];
  const skillCollections = agent.spec.skillCollectionRefs ?? [];

  if (skillCards.length === 0 && skillCollections.length === 0) {
    return <Text component="small">No skills assigned.</Text>;
  }

  return (
    <DescriptionList>
      {skillCards.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Skill Cards</DescriptionListTerm>
          <DescriptionListDescription>
            <LabelGroup>
              {skillCards.map((ref) => (
                <Label key={ref.name}>{ref.name}</Label>
              ))}
            </LabelGroup>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {skillCollections.length > 0 && (
        <DescriptionListGroup>
          <DescriptionListTerm>Skill Collections</DescriptionListTerm>
          <DescriptionListDescription>
            <LabelGroup>
              {skillCollections.map((ref) => (
                <Label key={ref.name} color="purple">
                  {ref.name}
                </Label>
              ))}
            </LabelGroup>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );
};
