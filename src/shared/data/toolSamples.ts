export const toolSamples: Record<string, string> = {
  'json-toolkit': '{\n  "name": "ZeroDock",\n  "version": 1,\n  "features": ["fast", "local", "secure"]\n}',
  'encode-decode': 'Hello, ZeroDock! This is a sample string to encode.',
  'security': 'ZeroDock — privacy-first developer tools',
  'yaml-json-converter': 'name: ZeroDock\nversion: 1.0\nfeatures:\n  - fast\n  - local\n  - secure',
  'diff-checker': 'function hello() {\n  console.log("Hello");\n}',
  'json-type-converter': '{\n  "id": 1,\n  "name": "ZeroDock",\n  "active": true,\n  "tags": ["dev", "tools"]\n}',
  'json-path': '{\n  "store": {\n    "books": [\n      { "title": "Refactoring", "price": 29.99 },\n      { "title": "Clean Code", "price": 34.99 }\n    ]\n  }\n}',
  'base64-codec': 'Hello, ZeroDock! This is a sample string to encode.',
  'url-encoder': 'https://example.com/search?q=hello world&lang=en',
  'jwt-decoder': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'hash-generator': 'ZeroDock — privacy-first developer tools',
  'epoch-converter': String(Math.floor(Date.now() / 1000)),
};

export function getToolSample(toolId: string): string | undefined {
  const sample = toolSamples[toolId];
  return sample || undefined;
}
