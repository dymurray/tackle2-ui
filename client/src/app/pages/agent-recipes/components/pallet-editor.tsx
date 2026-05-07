import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  ButtonVariant,
  FormGroup,
  Switch,
  Text,
  TextArea,
  TextContent,
  TextInput,
  Title,
} from "@patternfly/react-core";
import { PlusCircleIcon, TrashIcon } from "@patternfly/react-icons";
import spacing from "@patternfly/react-styles/css/utilities/Spacing/spacing";

import {
  PalletConfig,
  PalletSource,
  parsePalletYaml,
  serializePalletYaml,
} from "./pallet-utils";

export type { PalletConfig, PalletSource } from "./pallet-utils";

interface PalletEditorProps {
  value: string;
  onChange: (yaml: string) => void;
}

const DEFAULT_PLACEHOLDER = `sources:
  - name: my-skills
    type: git
    url: https://github.com/org/skills
    paths:
      - skills/java-ee-to-quarkus

agents:
  auto_detect: true`;

export const PalletEditor: React.FC<PalletEditorProps> = ({
  value,
  onChange,
}) => {
  const [mode, setMode] = useState<"form" | "yaml">("form");

  const config = useMemo(() => parsePalletYaml(value), [value]);

  const updateConfig = useCallback(
    (updater: (draft: PalletConfig) => void) => {
      const current = parsePalletYaml(value) || {
        sources: [],
        agents: { auto_detect: true },
      };
      updater(current);
      onChange(serializePalletYaml(current));
    },
    [value, onChange]
  );

  const addSource = () => {
    updateConfig((draft) => {
      draft.sources.push({
        name: `source-${draft.sources.length + 1}`,
        type: "git",
        url: "",
        paths: [],
      });
    });
  };

  const removeSource = (index: number) => {
    updateConfig((draft) => {
      draft.sources.splice(index, 1);
    });
  };

  const updateSource = (
    index: number,
    field: keyof PalletSource,
    val: string | string[]
  ) => {
    updateConfig((draft) => {
      const source = draft.sources[index];
      if (!source) return;
      if (field === "paths") {
        source.paths = val as string[];
      } else {
        (source as unknown as Record<string, unknown>)[field] = val;
      }
    });
  };

  const toggleAutoDetect = (checked: boolean) => {
    updateConfig((draft) => {
      draft.agents = draft.agents || {};
      draft.agents.auto_detect = checked;
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Title headingLevel="h4" size="md">
          Pallet Configuration
        </Title>
        <Switch
          id="pallet-mode-toggle"
          label="YAML"
          labelOff="Form"
          isChecked={mode === "yaml"}
          onChange={(_event, checked) => setMode(checked ? "yaml" : "form")}
          isReversed
        />
      </div>

      {mode === "yaml" ? (
        <FormGroup fieldId="pallet-yaml-raw">
          <TextArea
            id="pallet-yaml-raw"
            value={value}
            onChange={(_event, val) => onChange(val)}
            aria-label="Pallet YAML"
            rows={12}
            resizeOrientation="vertical"
            placeholder={DEFAULT_PLACEHOLDER}
            style={{ fontFamily: "monospace", fontSize: "0.85em" }}
          />
        </FormGroup>
      ) : (
        <div>
          {/* Sources */}
          <TextContent className={spacing.mbSm}>
            <Text component="small" style={{ fontWeight: 600 }}>
              Sources
            </Text>
          </TextContent>

          {(config?.sources || []).map((source, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid var(--pf-v5-global--BorderColor--100)",
                borderRadius: 4,
                padding: 12,
                marginBottom: 8,
                position: "relative",
              }}
            >
              <Button
                variant="plain"
                icon={<TrashIcon />}
                onClick={() => removeSource(idx)}
                isDanger
                style={{ position: "absolute", top: 4, right: 4 }}
                aria-label="Remove source"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <FormGroup label="Name" fieldId={`source-name-${idx}`}>
                  <TextInput
                    id={`source-name-${idx}`}
                    value={source.name}
                    onChange={(_event, val) => updateSource(idx, "name", val)}
                  />
                </FormGroup>
                <FormGroup label="Type" fieldId={`source-type-${idx}`}>
                  <TextInput
                    id={`source-type-${idx}`}
                    value={source.type}
                    onChange={(_event, val) => updateSource(idx, "type", val)}
                  />
                </FormGroup>
              </div>

              <FormGroup label="URL" fieldId={`source-url-${idx}`}>
                <TextInput
                  id={`source-url-${idx}`}
                  value={source.url || ""}
                  onChange={(_event, val) => updateSource(idx, "url", val)}
                  placeholder="https://github.com/org/skills"
                />
              </FormGroup>

              <FormGroup label="Ref (branch/tag)" fieldId={`source-ref-${idx}`}>
                <TextInput
                  id={`source-ref-${idx}`}
                  value={source.ref || ""}
                  onChange={(_event, val) => updateSource(idx, "ref", val)}
                  placeholder="main"
                />
              </FormGroup>

              <FormGroup
                label="Paths (one per line)"
                fieldId={`source-paths-${idx}`}
              >
                <TextArea
                  id={`source-paths-${idx}`}
                  value={(source.paths || []).join("\n")}
                  onChange={(_event, val) =>
                    updateSource(
                      idx,
                      "paths",
                      val.split("\n").filter((l) => l.trim())
                    )
                  }
                  rows={3}
                  placeholder={`skills/java-ee-to-quarkus\nagents`}
                  style={{ fontFamily: "monospace", fontSize: "0.85em" }}
                />
              </FormGroup>
            </div>
          ))}

          <Button
            variant={ButtonVariant.link}
            icon={<PlusCircleIcon />}
            onClick={addSource}
            style={{ marginBottom: 12 }}
          >
            Add Source
          </Button>

          {/* Agents */}
          <FormGroup fieldId="pallet-auto-detect" label="Agent Settings">
            <Switch
              id="pallet-auto-detect"
              label="Auto-detect agents"
              isChecked={config?.agents?.auto_detect ?? true}
              onChange={(_event, checked) => toggleAutoDetect(checked)}
            />
          </FormGroup>
        </div>
      )}
    </div>
  );
};

export default PalletEditor;
