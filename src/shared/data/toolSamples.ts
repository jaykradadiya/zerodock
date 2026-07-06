export const toolSamples: Record<string, string> = {
  'json-toolkit': '{\n  "name": "ZeroDock",\n  "version": 1,\n  "features": ["fast", "local", "secure"]\n}',
  'http': JSON.stringify({ name: 'ZeroDock', version: '1.0', features: ['fast', 'local'] }, null, 2),
  'encode-decode': 'Hello, ZeroDock! This is a sample string to encode.',
  'security': 'ZeroDock — privacy-first developer tools',
  'api-tester': JSON.stringify({ name: 'ZeroDock', version: '1.0', features: ['fast', 'local'] }, null, 2),
  'yaml-json-converter': 'name: ZeroDock\nversion: 1.0\nfeatures:\n  - fast\n  - local\n  - secure',
  'diff-checker': 'function hello() {\n  console.log("Hello");\n}',
  'json-type-converter': '{\n  "id": 1,\n  "name": "ZeroDock",\n  "active": true,\n  "tags": ["dev", "tools"]\n}',
  'json-path': '{\n  "store": {\n    "books": [\n      { "title": "Refactoring", "price": 29.99 },\n      { "title": "Clean Code", "price": 34.99 }\n    ]\n  }\n}',
  'base64-codec': 'Hello, ZeroDock! This is a sample string to encode.',
  'url-encoder': 'https://example.com/search?q=hello world&lang=en',
  'curl-converter': "curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\":\"ZeroDock\"}'",
  'jwt-decoder': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  'hash-generator': 'ZeroDock — privacy-first developer tools',
  'regex-tester': '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  'token-counter': 'You are a helpful assistant. Summarize the following text in three bullet points.',
  'mock-data-generator': '',
  'rsa-generator': '',
  'epoch-converter': String(Math.floor(Date.now() / 1000)),
};

export function getToolSample(toolId: string): string | undefined {
  const sample = toolSamples[toolId];
  return sample || undefined;
}
