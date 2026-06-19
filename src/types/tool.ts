import type { ComponentType, ElementType } from 'react';

export interface ToolMetadata {
  description: string;
  tags: string[];
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
