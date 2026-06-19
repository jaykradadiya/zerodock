import type { Tool } from '../../types/tool';
import { 
  FileJson, 
  Layers, 
  Fingerprint, 
  Binary, 
  KeyRound, 
  Hash, 
  Palette, 
  Link2,
  GitCompare,
  Clock,
  Code2,
  Calculator
} from 'lucide-react';

export const toolRegistry: Tool[] = [
  {
    id: 'diff-checker',
    name: 'Text Diff Checker',
    category: 'Text',
    route: '/diff-checker',
    icon: GitCompare,
    component: () => import('../../modules/tools/diff-checker'),
    metadata: {
      description: 'Compare two text files side-by-side with syntax highlighting.',
      tags: ['diff', 'compare', 'text', 'match'],
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
      description: 'Convert Unix timestamps to human-readable dates and vice-versa.',
      tags: ['epoch', 'timestamp', 'date', 'time', 'unix'],
    },
  },
  {
    id: 'json-type-converter',
    name: 'JSON to Types Converter',
    category: 'Data',
    route: '/json-type-converter',
    icon: Code2,
    component: () => import('../../modules/tools/json-type-converter'),
    metadata: {
      description: 'Convert JSON payloads into TypeScript, Go, Rust, or JSON Schema.',
      tags: ['json', 'types', 'typescript', 'go', 'rust', 'convert'],
    },
  },
  {
    id: 'pdf-merger',
    name: 'Merge PDF',
    category: 'PDF Tools',
    route: '/pdf-merger',
    icon: Layers,
    component: () => import('../../modules/tools/pdf-merger'),
    metadata: {
      description: 'Combine multiple PDFs and images into a single PDF file.',
      tags: ['pdf', 'merge', 'combine', 'join'],
    },
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    category: 'Data',
    route: '/json-formatter',
    icon: FileJson,
    component: () => import('../../modules/tools/json-formatter'),
    worker: () => new Worker(new URL('../../modules/tools/json-formatter/json.worker.ts', import.meta.url), { type: 'module' }),
    metadata: {
      description: 'Format, minify, and validate JSON payloads.',
      tags: ['json', 'format', 'minify', 'validate'],
    },
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    category: 'Generators',
    route: '/uuid-generator',
    icon: Fingerprint,
    component: () => import('../../modules/tools/uuid-generator'),
    metadata: {
      description: 'Generate UUID v4 and v7 identifiers instantly.',
      tags: ['uuid', 'guid', 'generator', 'unique'],
    },
  },
  {
    id: 'base64-codec',
    name: 'Base64 Encode/Decode',
    category: 'Encoding',
    route: '/base64-codec',
    icon: Binary,
    component: () => import('../../modules/tools/base64-codec'),
    metadata: {
      description: 'Encode and decode Base64 strings and files.',
      tags: ['base64', 'encode', 'decode', 'binary'],
    },
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    category: 'Security',
    route: '/jwt-decoder',
    icon: KeyRound,
    component: () => import('../../modules/tools/jwt-decoder'),
    metadata: {
      description: 'Decode and inspect JWT tokens with claim validation.',
      tags: ['jwt', 'token', 'decode', 'security', 'auth'],
    },
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    category: 'Security',
    route: '/hash-generator',
    icon: Hash,
    component: () => import('../../modules/tools/hash-generator'),
    metadata: {
      description: 'Generate secure cryptographic hashes instantly.',
      tags: ['hash', 'md5', 'sha', 'security', 'crypto'],
    },
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    category: 'Design',
    route: '/color-converter',
    icon: Palette,
    component: () => import('../../modules/tools/color-converter'),
    metadata: {
      description: 'Convert between HEX, RGB, and HSL color formats.',
      tags: ['color', 'hex', 'rgb', 'hsl', 'converter', 'design'],
    },
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder/Decoder',
    category: 'Encoding',
    route: '/url-encoder',
    icon: Link2,
    component: () => import('../../modules/tools/url-encoder'),
    metadata: {
      description: 'Safely encode and decode URL components and query strings.',
      tags: ['url', 'uri', 'encode', 'decode', 'link'],
    },
  },
  {
    id: 'downpayment-calculator',
    name: 'Downpayment & Installment Calculator',
    category: 'Calculators',
    route: '/downpayment-calculator',
    icon: Calculator,
    component: () => import('../../modules/tools/downpayment-calculator'),
    metadata: {
      description: 'Calculate down payment portions, installments, interest charges, and payment timelines.',
      tags: ['downpayment', 'installment', 'finance', 'calculator', 'interest'],
    },
  }
];

