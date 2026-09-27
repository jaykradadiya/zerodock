import type { ComponentType, ElementType } from 'react';

export type ToolTier = 'featured' | 'standard';
export type ProcessingMode = 'LOCAL' | 'NETWORK' | 'MIXED';

export interface ToolProcessing {
  /** Truthful processing classification, declared by the tool owner. */
  mode: ProcessingMode;
  /** Required whenever a tool can send user-provided data across the network. */
  networkDetail?: string;
}

export interface ToolMetadata {
  description: string;
  tags: string[];
  /** Explicit, verified alternate names used for search. */
  aliases?: string[];
  /** Explicitly declared processing behavior; never inferred by the UI. */
  processing: ToolProcessing;
  /** Registry IDs for existing, relevant tools. */
  relatedToolIds?: string[];
  /** Featured tools appear in the landing hero grid */
  tier?: ToolTier;
  /** When true, Share copies URL with encoded state */
  supportsShare?: boolean;
  /** Hidden from landing browse grid (hub children, deep links only) */
  hiddenFromBrowse?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  category: string;
  route: string;
  icon?: ElementType;
  component: () => Promise<{ default: ComponentType }>;
  worker?: () => Worker;
  metadata: ToolMetadata;
}

export const FEATURED_TOOL_IDS = [
  'json-toolkit',
] as const;

export function getLandingTools(tools: Tool[]) {
  return tools.filter((t) => !t.metadata.hiddenFromBrowse);
}

/** Fail early when a registry edit would create a broken discovery path. */
export function validateToolRegistry(tools: Tool[]): void {
  const ids = new Set<string>();
  const routes = new Set<string>();

  for (const tool of tools) {
    if (ids.has(tool.id)) throw new Error(`Duplicate tool ID: ${tool.id}`);
    if (routes.has(tool.route)) throw new Error(`Duplicate tool route: ${tool.route}`);
    if (!tool.route.startsWith('/')) throw new Error(`Invalid tool route: ${tool.route}`);
    if (tool.metadata.processing.mode !== 'LOCAL' && !tool.metadata.processing.networkDetail) {
      throw new Error(`Network detail is required for ${tool.id}`);
    }
    const aliases = tool.metadata.aliases ?? [];
    if (new Set(aliases.map((alias) => alias.trim().toLowerCase())).size !== aliases.length) {
      throw new Error(`Duplicate alias on ${tool.id}`);
    }
    if (aliases.some((alias) => !alias.trim())) throw new Error(`Empty alias on ${tool.id}`);
    ids.add(tool.id);
    routes.add(tool.route);
  }

  for (const tool of tools) {
    for (const relatedId of tool.metadata.relatedToolIds ?? []) {
      if (relatedId === tool.id) throw new Error(`Tool ${tool.id} cannot relate to itself`);
      if (!ids.has(relatedId)) throw new Error(`Unknown related tool ${relatedId} on ${tool.id}`);
    }
  }
}
