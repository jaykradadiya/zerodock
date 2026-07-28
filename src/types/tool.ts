import type { ComponentType, ElementType } from 'react';

export type ToolTier = 'featured' | 'standard';

export interface ToolMetadata {
  description: string;
  tags: string[];
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
  'encode-decode',
  'security',
  'diff-checker',
  'epoch-converter',
] as const;

export function getFeaturedTools(tools: Tool[]) {
  return FEATURED_TOOL_IDS.map((id) => tools.find((t) => t.id === id)).filter(Boolean) as Tool[];
}

export function getLandingTools(tools: Tool[]) {
  return tools.filter((t) => !t.metadata.hiddenFromBrowse);
}
