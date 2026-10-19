import type { Tool, ToolTier } from '../../types/tool';
import { FEATURED_TOOL_IDS, validateToolRegistry } from '../../types/tool';
import {
  FileJson,
  MessageSquareText,
  FileText,
} from 'lucide-react';

const NO_SHARE_IDS = new Set<string>();

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
      relatedToolIds: ['json-path'],
    },
  },
  {
    id: 'markdown-chat',
    name: 'Markdown for Chat',
    category: 'Text',
    route: '/markdown-chat',
    icon: MessageSquareText,
    component: () => import('../../modules/tools/markdown-chat'),
    metadata: {
      description: 'Convert Markdown into clean, chat-ready text for Slack and WhatsApp.',
      tags: ['markdown', 'slack', 'whatsapp', 'chat', 'format'],
      aliases: ['markdown to whatsapp', 'markdown to slack', 'chat markdown converter', 'markdown formatter'],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['docs-to-markdown'],
    },
  },
  {
    id: 'docs-to-markdown',
    name: 'Docs to Markdown',
    category: 'Text',
    route: '/docs-to-markdown',
    icon: FileText,
    component: () => import('../../modules/tools/docs-to-markdown'),
    metadata: {
      description: 'Convert Google Docs, Word, and rich text into clean GitHub Flavored Markdown.',
      tags: ['google docs', 'docs', 'markdown', 'word', 'html to markdown', 'convert', 'format'],
      aliases: [
        'google docs to markdown',
        'gdoc to markdown',
        'rich text to markdown',
        'html to markdown',
        'word to markdown',
        'doc converter',
      ],
      processing: { mode: 'LOCAL' },
      relatedToolIds: ['markdown-chat'],
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
      relatedToolIds: ['json-toolkit'],
      hiddenFromBrowse: true,
    },
  },
];

export const toolRegistry = rawToolRegistry.map(enrichTool);

validateToolRegistry(toolRegistry);
