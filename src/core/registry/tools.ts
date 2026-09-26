import type { Tool, ToolTier } from '../../types/tool';
import { FEATURED_TOOL_IDS, validateToolRegistry } from '../../types/tool';
import {
  FileJson,
  Binary,
  GitCompare,
  Clock,
  Shield,
} from 'lucide-react';

const NO_SHARE_IDS = new Set<string>(['jwt-decoder', 'security']);

function enrichTool(tool: Tool): Tool {
  const tier: ToolTier = (FEATURED_TOOL_IDS as readonly string[]).includes(tool.id)
    ? 'featured'
    : 'standard';
  return {
    ...tool,
    metadata: {
      ...tool.metadata,
      tier,
      supportsShare: !NO_SHARE_IDS.has(tool.id),
    },
  };
}

const rawToolRegistry: Tool[] = [
  // ── Hubs (landing cards) ──
  {
    id: 'json-toolkit',
    name: 'JSON Toolkit',
    category: 'Data',
    route: '/json-toolkit',
    icon: FileJson,
    component: () => import('../../modules/hubs/json-hub'),
    worker: () => new Worker(new URL('../../modules/tools/json-toolkit/json.worker.ts', import.meta.url), { type: 'module' }),
    metadata: {
      description: 'Format, validate, and explore JSON — tree, table, and JMESPath query tools in one workspace.',
      tags: ['json', 'format', 'tree', 'table', 'jmespath', 'schema', 'validate'],
      aliases: ['JSON formatter', 'JSON validator', 'format JSON'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['json-path', 'diff-checker'],
    },
  },
  {
    id: 'encode-decode',
    name: 'Encode / Decode',
    category: 'Encoding',
    route: '/encode-decode',
    icon: Binary,
    component: () => import('../../modules/hubs/encode-hub'),
    metadata: {
      description: 'Encode and decode Base64 strings and URL components entirely in your browser.',
      tags: ['base64', 'url', 'encode', 'decode', 'uri', 'percent encoding'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['base64-codec', 'url-encoder'],
    },
  },
  {
    id: 'security',
    name: 'Security Suite',
    category: 'Security',
    route: '/security',
    icon: Shield,
    component: () => import('../../modules/hubs/security-hub'),
    metadata: {
      description: 'Hash strings and decode JWTs — privacy-first crypto tools.',
      tags: ['hash', 'jwt', 'crypto', 'security', 'token'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['hash-generator', 'jwt-decoder'],
    },
  },
  {
    id: 'diff-checker',
    name: 'Text Diff Checker',
    category: 'Text',
    route: '/diff-checker',
    icon: GitCompare,
    component: () => import('../../modules/tools/diff-checker'),
    metadata: {
      description: 'Compare two text files or code snippets side-by-side with real-time syntax highlighting and inline diff views.',
      tags: ['diff', 'compare', 'text', 'match', 'code', 'difference', 'checker'],
      aliases: ['diff checker'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['json-toolkit', 'encode-decode'],
    },
  },
  {
    id: 'epoch-converter',
    name: 'Epoch Converter',
    category: 'Converters',
    route: '/epoch-converter',
    icon: Clock,
    component: () => import('../../modules/tools/epoch-converter'),
    metadata: {
      description: 'Convert Unix epoch timestamps to human-readable dates, local timezones, and UTC instantly.',
      tags: ['epoch', 'timestamp', 'date', 'time', 'unix', 'converter', 'timezone', 'utc'],
      aliases: ['Unix timestamp converter'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['json-toolkit'],
    },
  },


  {
    id: 'json-path',
    name: 'JSON Path',
    category: 'Data',
    route: '/json-path',
    icon: FileJson,
    component: () => import('../../modules/hubs/json-hub').then((m) => ({ default: m.JsonHubPath })),
    metadata: {
      description: 'Query JSON with JMESPath expressions.',
      tags: ['json', 'jmespath', 'query'],
      aliases: ['JMESPath'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['json-toolkit', 'diff-checker'],
      hiddenFromBrowse: true,
    },
  },
  {
    id: 'base64-codec',
    name: 'Base64 Codec',
    category: 'Encoding',
    route: '/base64-codec',
    icon: Binary,
    component: () => import('../../modules/hubs/encode-hub'),
    metadata: {
      description: 'Base64 encode and decode.',
      tags: ['base64'],
      aliases: ['Base64 encoder', 'Base64 decoder'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['encode-decode', 'url-encoder'],
      hiddenFromBrowse: true,
    },
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder',
    category: 'Encoding',
    route: '/url-encoder',
    icon: Binary,
    component: () => import('../../modules/hubs/encode-hub').then((m) => ({ default: m.EncodeHubUrl })),
    metadata: {
      description: 'URL encode and decode.',
      tags: ['url'],
      aliases: ['URL decoder'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['encode-decode', 'base64-codec'],
      hiddenFromBrowse: true,
    },
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    category: 'Security',
    route: '/hash-generator',
    icon: Shield,
    component: () => import('../../modules/hubs/security-hub'),
    metadata: {
      description: 'Generate cryptographic hashes.',
      tags: ['hash', 'sha'],
      aliases: ['SHA generator'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['security', 'jwt-decoder'],
      hiddenFromBrowse: true,
    },
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    category: 'Security',
    route: '/jwt-decoder',
    icon: Shield,
    component: () => import('../../modules/hubs/security-hub').then((m) => ({ default: m.SecurityHubJwt })),
    metadata: {
      description: 'Decode JWT tokens offline.',
      tags: ['jwt', 'token'],
      aliases: ['token decoder'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['security', 'hash-generator'],
      hiddenFromBrowse: true,
    },
  },
];

export const toolRegistry = rawToolRegistry.map(enrichTool);

validateToolRegistry(toolRegistry);
