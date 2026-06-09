import * as React from "react";
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Text,
  TextContent,
  Title,
} from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import type { AgentPlan } from "@app/api/k8s-models";
import { PageDrawerContent } from "@app/components/PageDrawerContext";

export interface IAgentPlanDetailDrawerProps {
  onCloseClick: () => void;
  plan: AgentPlan | null;
}

const AgentPlanDetailDrawer: React.FC<IAgentPlanDetailDrawerProps> = ({
  onCloseClick,
  plan,
}) => {
  return (
    <PageDrawerContent
      isExpanded={!!plan}
      onCloseClick={onCloseClick}
      focusKey={plan?.metadata.name}
      pageKey="agent-plan-details"
      header={
        <TextContent>
          <Text component="small" className={spacing.mb_0}>
            Agent Plan
          </Text>
          <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
            {plan?.metadata.name}
          </Title>
        </TextContent>
      }
    >
      {plan && (
        <div>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Description</DescriptionListTerm>
              <DescriptionListDescription>
                {plan.spec.description}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                {plan.status?.ready ? (
                  <Label color="green">Ready</Label>
                ) : (
                  <Label color="grey">Pending</Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>

          {plan.spec.guide && (
            <>
              <Title headingLevel="h3" size="md" className={spacing.mtLg}>
                Guide
              </Title>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "var(--pf-v5-global--BackgroundColor--200)",
                  padding: "var(--pf-v5-global--spacer--sm)",
                  borderRadius: 4,
                  fontSize: "0.85em",
                }}
              >
                {plan.spec.guide}
              </pre>
            </>
          )}

          {plan.spec.stages?.map((stage, si) => (
            <div key={stage.name} className={spacing.mtLg}>
              <Title headingLevel="h3" size="md">
                Stage {si + 1}: {stage.name}
              </Title>
              {stage.description && (
                <Text component="small">{stage.description}</Text>
              )}
              <Text component="small">
                Agent: <strong>{stage.agentRef.name}</strong>
              </Text>

              {stage.phases.map((phase, pi) => (
                <div
                  key={phase.name}
                  style={{
                    marginLeft: 16,
                    marginTop: 8,
                    paddingLeft: 12,
                    borderLeft:
                      "2px solid var(--pf-v5-global--BorderColor--100)",
                  }}
                >
                  <Text component="p">
                    <strong>
                      Phase {pi + 1}: {phase.name}
                    </strong>
                  </Text>
                  {phase.description && (
                    <Text component="small">{phase.description}</Text>
                  )}
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      background:
                        "var(--pf-v5-global--BackgroundColor--200)",
                      padding: "var(--pf-v5-global--spacer--xs)",
                      borderRadius: 4,
                      fontSize: "0.8em",
                      marginTop: 4,
                    }}
                  >
                    {phase.instructions}
                  </pre>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </PageDrawerContent>
  );
};

export default AgentPlanDetailDrawer;
