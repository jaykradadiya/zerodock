export const toolSamples: Record<string, string> = {
  'json-toolkit': '{\n  "name": "ZeroDock",\n  "version": 1,\n  "features": ["fast", "local", "secure"]\n}',
  'json-path': '{\n  "store": {\n    "books": [\n      { "title": "Refactoring", "price": 29.99 },\n      { "title": "Clean Code", "price": 34.99 }\n    ]\n  }\n}',
};

export function getToolSample(toolId: string): string | undefined {
  const sample = toolSamples[toolId];
  return sample || undefined;
}
