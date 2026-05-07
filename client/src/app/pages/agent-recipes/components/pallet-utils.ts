export interface PalletSource {
  name: string;
  type: "git" | "hub";
  url?: string;
  ref?: string;
  paths?: string[];
}

export interface PalletConfig {
  sources: PalletSource[];
  agents?: {
    auto_detect?: boolean;
  };
  hub?: {
    url?: string;
  };
}

const EMPTY_SOURCE: PalletSource = {
  name: "",
  type: "git",
  url: "",
  ref: "",
  paths: [],
};

/**
 * Parse pallet YAML into structured config.
 * Hand-rolled parser tuned to the known pallet.yaml shape.
 */
export function parsePalletYaml(yaml: string): PalletConfig | null {
  try {
    if (!yaml.trim()) return { sources: [], agents: { auto_detect: true } };

    const config: PalletConfig = { sources: [] };
    const lines = yaml.split("\n");
    let currentSource: PalletSource | null = null;
    let inSources = false;
    let inPaths = false;
    let inAgents = false;
    let inHub = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      if (trimmed === "sources:") {
        inSources = true;
        inAgents = false;
        inHub = false;
        inPaths = false;
        continue;
      }
      if (trimmed === "agents:") {
        inAgents = true;
        inSources = false;
        inHub = false;
        inPaths = false;
        if (currentSource) {
          config.sources.push(currentSource);
          currentSource = null;
        }
        config.agents = {};
        continue;
      }
      if (trimmed === "hub:") {
        inHub = true;
        inSources = false;
        inAgents = false;
        inPaths = false;
        config.hub = {};
        continue;
      }

      if (inSources) {
        if (trimmed.startsWith("- name:")) {
          if (currentSource) config.sources.push(currentSource);
          currentSource = {
            ...EMPTY_SOURCE,
            name: trimmed.replace("- name:", "").trim(),
          };
          inPaths = false;
          continue;
        }
        if (currentSource) {
          if (trimmed.startsWith("type:")) {
            currentSource.type = trimmed.replace("type:", "").trim() as
              | "git"
              | "hub";
          } else if (trimmed.startsWith("url:")) {
            currentSource.url = trimmed.replace("url:", "").trim();
          } else if (trimmed.startsWith("ref:")) {
            currentSource.ref = trimmed.replace("ref:", "").trim();
          } else if (trimmed === "paths:") {
            inPaths = true;
            currentSource.paths = [];
          } else if (inPaths && trimmed.startsWith("- ")) {
            currentSource.paths = currentSource.paths || [];
            currentSource.paths.push(trimmed.replace("- ", "").trim());
          }
        }
      }

      if (inAgents) {
        if (trimmed.startsWith("auto_detect:")) {
          config.agents = config.agents || {};
          config.agents.auto_detect = trimmed.includes("true");
        }
      }

      if (inHub) {
        if (trimmed.startsWith("url:")) {
          config.hub = config.hub || {};
          config.hub.url = trimmed.replace("url:", "").trim();
        }
      }
    }

    if (currentSource) config.sources.push(currentSource);
    return config;
  } catch {
    return null;
  }
}

/**
 * Serialize structured config back to YAML.
 */
export function serializePalletYaml(config: PalletConfig): string {
  const lines: string[] = [];

  if (config.hub?.url) {
    lines.push("hub:");
    lines.push(`  url: ${config.hub.url}`);
    lines.push("");
  }

  if (config.sources.length > 0) {
    lines.push("sources:");
    for (const source of config.sources) {
      if (!source.name) continue;
      lines.push(`  - name: ${source.name}`);
      lines.push(`    type: ${source.type || "git"}`);
      if (source.url) lines.push(`    url: ${source.url}`);
      if (source.ref) lines.push(`    ref: ${source.ref}`);
      if (source.paths && source.paths.length > 0) {
        lines.push("    paths:");
        for (const p of source.paths) {
          if (p.trim()) lines.push(`      - ${p}`);
        }
      }
      lines.push("");
    }
  }

  if (config.agents) {
    lines.push("agents:");
    if (config.agents.auto_detect !== undefined) {
      lines.push(`  auto_detect: ${config.agents.auto_detect}`);
    }
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Merge multiple pallet YAML strings into a single pallet.yaml.
 *
 * Strategy:
 * - sources[]: concatenated in order. If the same source name appears more
 *   than once, the later entry overrides the earlier one (so an agent that
 *   layers a more-specific recipe last wins for that source name).
 * - agents.auto_detect: true if ANY recipe enables it.
 * - hub.url: last non-empty value wins.
 */
export function mergePalletYamls(yamls: string[]): string {
  const merged: PalletConfig = { sources: [] };
  const sourcesByName = new Map<string, PalletSource>();
  let autoDetect: boolean | undefined;
  let hubUrl: string | undefined;

  for (const yaml of yamls) {
    const cfg = parsePalletYaml(yaml);
    if (!cfg) continue;

    for (const src of cfg.sources) {
      if (!src.name) continue;
      sourcesByName.set(src.name, src);
    }

    if (cfg.agents?.auto_detect) {
      autoDetect = true;
    } else if (autoDetect === undefined && cfg.agents?.auto_detect === false) {
      autoDetect = false;
    }

    if (cfg.hub?.url) {
      hubUrl = cfg.hub.url;
    }
  }

  merged.sources = Array.from(sourcesByName.values());
  if (autoDetect !== undefined) {
    merged.agents = { auto_detect: autoDetect };
  }
  if (hubUrl) {
    merged.hub = { url: hubUrl };
  }

  return serializePalletYaml(merged);
}
