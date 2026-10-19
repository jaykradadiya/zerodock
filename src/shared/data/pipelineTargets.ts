import { toolRegistry } from '../../core/registry/tools';

const byId = (id: string) => {
  const tool = toolRegistry.find((t) => t.id === id);
  return tool ? { id: tool.id, name: tool.name, route: tool.route } : null;
};

const jsonTargets = ['json-toolkit']
  .map(byId)
  .filter(Boolean) as { id: string; name: string; route: string }[];

const defaultPipelineTargets: Record<string, { id: string; name: string; route: string }[]> = {
  'json-path': jsonTargets,
  'json-toolkit': jsonTargets,
  'docs-to-markdown': ['markdown-chat', 'json-toolkit'].map(byId).filter(Boolean) as { id: string; name: string; route: string }[],
  'markdown-chat': ['docs-to-markdown', 'json-toolkit'].map(byId).filter(Boolean) as { id: string; name: string; route: string }[],
};

export function getPipelineTargets(toolId: string) {
  return defaultPipelineTargets[toolId] ?? jsonTargets;
}
