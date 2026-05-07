import * as React from "react";
import { Text, TextContent, Title } from "@patternfly/react-core";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import { AgentPlan } from "@app/api/models";
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
      focusKey={plan?.id}
      pageKey="agent-plan-details"
      header={
        <TextContent>
          <Text component="small" className={spacing.mb_0}>
            Agent Plan
          </Text>
          <Title headingLevel="h2" size="lg" className={spacing.mtXs}>
            {plan?.name}
          </Title>
        </TextContent>
      }
    >
      {plan && (
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
          {plan.markdown}
        </pre>
      )}
    </PageDrawerContent>
  );
};

export default AgentPlanDetailDrawer;
