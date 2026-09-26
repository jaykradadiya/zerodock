import { toolRegistry } from '../../core/registry/tools';

const byId = (id: string) => {
  const tool = toolRegistry.find((t) => t.id === id);
  return tool ? { id: tool.id, name: tool.name, route: tool.route } : null;
};

const jsonTargets = ['json-toolkit', 'security']
  .map(byId)
  .filter(Boolean) as { id: string; name: string; route: string }[];

const textTargets = ['diff-checker', 'encode-decode', 'json-toolkit']
  .map(byId)
  .filter(Boolean) as { id: string; name: string; route: string }[];

const defaultPipelineTargets: Record<string, { id: string; name: string; route: string }[]> = {
  'json-path': jsonTargets,
  'base64-codec': textTargets,
  'url-encoder': textTargets,
  'encode-decode': textTargets,
  'hash-generator': textTargets,
  'jwt-decoder': jsonTargets,
  'security': jsonTargets,
  'diff-checker': textTargets,
};

export function getPipelineTargets(toolId: string) {
  return defaultPipelineTargets[toolId] ?? jsonTargets;
}
