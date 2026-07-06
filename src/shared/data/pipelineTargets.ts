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

const networkTargets = ['http', 'json-toolkit']
  .map(byId)
  .filter(Boolean) as { id: string; name: string; route: string }[];

export const defaultPipelineTargets: Record<string, { id: string; name: string; route: string }[]> = {
  'yaml-json-converter': jsonTargets,
  'json-type-converter': jsonTargets,
  'json-path': jsonTargets,
  'base64-codec': textTargets,
  'url-encoder': textTargets,
  'encode-decode': textTargets,
  'curl-converter': networkTargets,
  'api-tester': jsonTargets,
  'http': jsonTargets,
  'hash-generator': textTargets,
  'jwt-decoder': jsonTargets,
  'security': jsonTargets,
  'mock-data-generator': jsonTargets,
  'diff-checker': textTargets,
};

export function getPipelineTargets(toolId: string) {
  return defaultPipelineTargets[toolId] ?? jsonTargets;
}
