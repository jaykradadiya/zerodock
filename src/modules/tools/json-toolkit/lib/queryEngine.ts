import jmespath from 'jmespath';

export type FilterType = 'jmespath' | 'jsonpath' | 'dotpath';

export interface FilterTypeOption {
  id: FilterType;
  label: string;
  placeholder: string;
  description: string;
  defaultQuery: string;
  snippet?: string;
}

export const FILTER_TYPES: FilterTypeOption[] = [
  {
    id: 'jmespath',
    label: 'JMESPath',
    placeholder: 'e.g. charge.id, keys(@), outcome, or items[?paid==`true`]',
    description: 'Declarative query language for JSON (filters, projections, multi-selects)',
    defaultQuery: '@',
  },
  {
    id: 'jsonpath',
    label: 'JSONPath',
    placeholder: 'e.g. $.charge.id, $..outcome, or $[*].amount',
    description: 'XPath-like syntax for JSON structures (supports $..recursive lookups)',
    defaultQuery: '$',
  },
  {
    id: 'dotpath',
    label: 'Dot Path',
    placeholder: 'e.g. charge.id, outcome.type, or items.*.id',
    description: 'Simple dot-separated property accessor with wildcard (*) support',
    defaultQuery: '*',
  },

];

export interface QuerySuggestion {
  query: string;
  label: string;
  category: 'root' | 'property' | 'pattern';
}

export type PresetCategory = 'filters' | 'transforms' | 'aggregations' | 'sort' | 'inspection';

export interface QueryPreset {
  label: string;
  description: string;
  query: string;
  category: PresetCategory;
  exampleOutput?: string;
}

export const PRESET_CATEGORIES: { id: PresetCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'filters', label: 'Filter & Search' },
  { id: 'transforms', label: 'Transform' },
  { id: 'aggregations', label: 'Math & Aggs' },
  { id: 'sort', label: 'Sort & Slice' },
  { id: 'inspection', label: 'Structure' },
];

export const PRESET_SNIPPETS: Record<FilterType, QueryPreset[]> = {
  jmespath: [
    // Filters
    {
      label: 'Filter: Value Equals',
      description: 'Filter items where string equals value',
      query: "charge.fee_details[?type == 'application_fee']",
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "amount": 279900,\n    "currency": "usd"\n  }\n]',
    },
    {
      label: 'Filter: Greater Than',
      description: 'Numeric comparison filter',
      query: 'charge.fee_details[?amount > `1000`]',
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "amount": 279900\n  }\n]',
    },
    {
      label: 'Filter: String Contains',
      description: 'Filter items containing substring',
      query: "charge.fee_details[?contains(description, 'fee')]",
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "stripe_fee",\n    "description": "Stripe processing fees"\n  }\n]',
    },
    {
      label: 'Filter: Non-Null Field',
      description: 'Filter items where field is not null',
      query: 'charge.fee_details[?application != null]',
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "application": "ca_QJGL3fYsZPlpQ7TF..."\n  }\n]',
    },

    // Math & Aggregations
    {
      label: 'Math: Sum Numbers',
      description: 'Sum array of numeric properties',
      query: 'sum(charge.fee_details[*].amount)',
      category: 'aggregations',
      exampleOutput: '294430',
    },
    {
      label: 'Math: Length / Count',
      description: 'Item count of array or keys',
      query: 'length(charge.fee_details)',
      category: 'aggregations',
      exampleOutput: '2',
    },
    {
      label: 'Math: Max / Min',
      description: 'Largest or smallest numeric value',
      query: '{ min: min(charge.fee_details[*].amount), max: max(charge.fee_details[*].amount) }',
      category: 'aggregations',
      exampleOutput: '{\n  "min": 14530,\n  "max": 279900\n}',
    },

    // Transforms
    {
      label: 'Pluck: Multi-Field Hash',
      description: 'Extract selected properties as new objects',
      query: 'charge.fee_details[*].{type: type, amount: amount}',
      category: 'transforms',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "amount": 279900\n  },\n  {\n    "type": "stripe_fee",\n    "amount": 14530\n  }\n]',
    },
    {
      label: 'Flatten: Flatten Array',
      description: 'Flatten nested arrays or values',
      query: 'charge.fee_details[].type',
      category: 'transforms',
      exampleOutput: '[\n  "application_fee",\n  "stripe_fee"\n]',
    },

    // Sort & Slice
    {
      label: 'Sort: Ascending by Field',
      description: 'Sort elements by key',
      query: 'sort_by(charge.fee_details, &amount)',
      category: 'sort',
      exampleOutput: '[\n  { "amount": 14530 },\n  { "amount": 279900 }\n]',
    },
    {
      label: 'Sort: Descending (Reverse)',
      description: 'Sort in reverse order',
      query: 'reverse(sort_by(charge.fee_details, &amount))',
      category: 'sort',
      exampleOutput: '[\n  { "amount": 279900 },\n  { "amount": 14530 }\n]',
    },
    {
      label: 'Slice: First 5',
      description: 'Slice first 5 elements',
      query: 'charge.fee_details[:5]',
      category: 'sort',
      exampleOutput: '[\n  { "type": "application_fee" }\n]',
    },

    // Inspection
    {
      label: 'Keys: Object Keys',
      description: 'List all properties',
      query: 'keys(@)',
      category: 'inspection',
      exampleOutput: '[\n  "charge",\n  "metadata"\n]',
    },
    {
      label: 'Values: Object Values',
      description: 'List property values',
      query: 'values(charge)',
      category: 'inspection',
      exampleOutput: '[\n  "ch_3Tk02PMGE...",\n  500000,\n  "usd"\n]',
    },
  ],

  jsonpath: [
    // Filters & Traversal
    {
      label: 'Filter: String Equals',
      description: 'Filter items where property equals value',
      query: '$.charge.fee_details[?(@.type == "application_fee")]',
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "amount": 279900\n  }\n]',
    },
    {
      label: 'Filter: Numeric Comparison',
      description: 'Filter items where amount exceeds 1000',
      query: '$.charge.fee_details[?(@.amount > 1000)]',
      category: 'filters',
      exampleOutput: '[\n  {\n    "type": "application_fee",\n    "amount": 279900\n  }\n]',
    },
    {
      label: 'Deep Search: Find by Key',
      description: 'Recursively locate all matching properties',
      query: '$..amount',
      category: 'filters',
      exampleOutput: '[\n  500000,\n  279900,\n  14530\n]',
    },

    // Transforms & Slices
    {
      label: 'Pluck: Single Field Array',
      description: 'Extract all field values across array',
      query: '$.charge.fee_details[*].amount',
      category: 'transforms',
      exampleOutput: '[\n  279900,\n  14530\n]',
    },
    {
      label: 'Slice: First Element',
      description: 'First array element',
      query: '$.charge.fee_details[0]',
      category: 'sort',
      exampleOutput: '{\n  "type": "application_fee",\n  "amount": 279900\n}',
    },
    {
      label: 'Root Document',
      description: 'Entire document root',
      query: '$',
      category: 'inspection',
      exampleOutput: '{\n  "charge": { ... }\n}',
    },
  ],

  dotpath: [
    {
      label: 'All Items Wildcard',
      description: 'Project all properties with wildcard',
      query: 'charge.fee_details.*.amount',
      category: 'transforms',
      exampleOutput: '[\n  279900,\n  14530\n]',
    },
    {
      label: 'First Element',
      description: 'Zero-indexed element',
      query: 'charge.fee_details.0',
      category: 'sort',
      exampleOutput: '{\n  "type": "application_fee",\n  "amount": 279900\n}',
    },
    {
      label: 'Nested Property',
      description: 'Deep property accessor',
      query: 'charge.outcome.network_status',
      category: 'filters',
      exampleOutput: '"approved_by_network"',
    },
    {
      label: 'Entire Document',
      description: 'Wildcard root accessor',
      query: '*',
      category: 'inspection',
      exampleOutput: '{\n  "charge": { ... }\n}',
    },
  ],
};

export function generateSmartSuggestions(data: any, filterType: FilterType): QuerySuggestion[] {
  const suggestions: QuerySuggestion[] = [];
  if (!data || typeof data !== 'object') return suggestions;

  if (filterType === 'jmespath') {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        Object.keys(data[0]).slice(0, 8).forEach((k) => {
          suggestions.push({ query: `[*].${k}`, label: `[*].${k}`, category: 'property' });
        });
      }
    } else {
      const keys = Object.keys(data);
      keys.slice(0, 8).forEach((k) => {
        suggestions.push({ query: k, label: k, category: 'property' });
        const val = data[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          Object.keys(val).slice(0, 4).forEach((subK) => {
            suggestions.push({ query: `${k}.${subK}`, label: `${k}.${subK}`, category: 'property' });
          });
        } else if (Array.isArray(val)) {
          if (val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
            Object.keys(val[0]).slice(0, 3).forEach((subK) => {
              suggestions.push({ query: `${k}[*].${subK}`, label: `${k}[*].${subK}`, category: 'property' });
            });
          }
        }
      });
    }
  } else if (filterType === 'jsonpath') {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        Object.keys(data[0]).slice(0, 6).forEach((k) => {
          suggestions.push({ query: `$..${k}`, label: `$..${k}`, category: 'property' });
        });
      }
    } else {
      Object.keys(data).slice(0, 8).forEach((k) => {
        suggestions.push({ query: `$.${k}`, label: `$.${k}`, category: 'property' });
        const val = data[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          Object.keys(val).slice(0, 4).forEach((subK) => {
            suggestions.push({ query: `$.${k}.${subK}`, label: `$.${k}.${subK}`, category: 'property' });
          });
        }
      });
    }
  } else if (filterType === 'dotpath') {
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        Object.keys(data[0]).slice(0, 6).forEach((k) => {
          suggestions.push({ query: `*.${k}`, label: `*.${k}`, category: 'property' });
        });
      }
    } else {
      Object.keys(data).slice(0, 8).forEach((k) => {
        suggestions.push({ query: k, label: k, category: 'property' });
        const val = data[k];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          Object.keys(val).slice(0, 4).forEach((subK) => {
            suggestions.push({ query: `${k}.${subK}`, label: `${k}.${subK}`, category: 'property' });
          });
        }
      });
    }
  }

  return suggestions;
}

export interface QuickFilterChip {
  label: string;
  iconType: 'filter' | 'sum' | 'sort' | 'pluck' | 'keys' | 'count';
  query: string;
}

export function generateQuickFilterChips(data: any, filterType: FilterType): QuickFilterChip[] {
  const chips: QuickFilterChip[] = [];
  if (!data || typeof data !== 'object') return chips;

  let arrayPath = '';
  let targetArray: any[] | null = null;

  if (Array.isArray(data)) {
    targetArray = data;
    arrayPath = '';
  } else {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) {
        arrayPath = k;
        targetArray = v;
        break;
      }
      if (v && typeof v === 'object') {
        for (const [subK, subV] of Object.entries(v as object)) {
          if (Array.isArray(subV)) {
            arrayPath = `${k}.${subK}`;
            targetArray = subV;
            break;
          }
        }
        if (targetArray) break;
      }
    }
  }

  let numField = '';
  let strField = '';
  if (targetArray && targetArray.length > 0 && typeof targetArray[0] === 'object' && targetArray[0] !== null) {
    for (const [k, v] of Object.entries(targetArray[0])) {
      if (typeof v === 'number' && !numField) numField = k;
      if (typeof v === 'string' && !strField) strField = k;
      if (numField && strField) break;
    }
  }

  if (filterType === 'jmespath') {
    chips.push({ label: 'keys(@)', iconType: 'keys', query: 'keys(@)' });
    if (targetArray) {
      const p = arrayPath ? `${arrayPath}` : '@';
      if (numField) {
        chips.push({ label: `Sum: ${numField}`, iconType: 'sum', query: `sum(${p}[*].${numField})` });
        chips.push({ label: `Filter: ${numField} > 0`, iconType: 'filter', query: `${p}[?${numField} > \`0\`]` });
        chips.push({ label: `Sort: ${numField}`, iconType: 'sort', query: `sort_by(${p}, &${numField})` });
      }
      if (strField) {
        chips.push({ label: `Pluck: ${strField}`, iconType: 'pluck', query: `${p}[*].${strField}` });
      }
      chips.push({ label: 'Count', iconType: 'count', query: `length(${p})` });
    }

  } else if (filterType === 'jsonpath') {
    chips.push({ label: '$ (Root)', iconType: 'keys', query: '$' });
    if (targetArray) {
      const p = arrayPath ? `$.${arrayPath}` : '$';
      if (numField) {
        chips.push({ label: `Filter: ${numField} > 0`, iconType: 'filter', query: `${p}[?(@.${numField} > 0)]` });
        chips.push({ label: `All ${numField}`, iconType: 'pluck', query: `${p}[*].${numField}` });
      }
      if (strField) {
        chips.push({ label: `All ${strField}`, iconType: 'pluck', query: `${p}[*].${strField}` });
      }
    }
  } else if (filterType === 'dotpath') {
    chips.push({ label: '* (Root)', iconType: 'keys', query: '*' });
    if (targetArray) {
      const p = arrayPath ? `${arrayPath}` : '';
      if (numField) {
        chips.push({ label: `All ${numField}`, iconType: 'pluck', query: p ? `${p}.*.${numField}` : `*.${numField}` });
      }
      if (strField) {
        chips.push({ label: `All ${strField}`, iconType: 'pluck', query: p ? `${p}.*.${strField}` : `*.${strField}` });
      }
    }
  }

  return chips.slice(0, 6);
}

export interface QueryResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Simple, robust JSONPath evaluator supporting:
 * - $.property.subproperty
 * - $.array[0], $.array[*]
 * - $..recursiveKey
 */
function evaluateJsonPath(data: any, pathStr: string): any {
  let cleanPath = pathStr.trim();
  if (cleanPath.startsWith('$')) {
    cleanPath = cleanPath.slice(1);
  }
  if (cleanPath.startsWith('.')) {
    cleanPath = cleanPath.slice(1);
  }

  if (!cleanPath) return data;

  // Handle recursive search $..key
  if (cleanPath.startsWith('.')) {
    const searchKey = cleanPath.slice(1);
    const results: any[] = [];
    const searchDeep = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(item => searchDeep(item));
      } else {
        Object.keys(node).forEach(key => {
          if (key === searchKey) {
            results.push(node[key]);
          }
          searchDeep(node[key]);
        });
      }
    };
    searchDeep(data);
    return results;
  }

  // Tokenize dot and bracket notations
  const tokens = cleanPath.match(/([^.[\]]+|\[\*\]|\[\d+\])/g) || [];
  let current: any = data;

  for (const token of tokens) {
    if (current === undefined || current === null) return undefined;

    if (token === '[*]' || token === '*') {
      if (Array.isArray(current)) {
        return current;
      } else if (typeof current === 'object') {
        return Object.values(current);
      }
    } else if (token.startsWith('[') && token.endsWith(']')) {
      const idxStr = token.slice(1, -1);
      if (idxStr === '*') {
        if (Array.isArray(current)) return current;
      } else {
        const idx = parseInt(idxStr, 10);
        if (Array.isArray(current)) {
          current = current[idx];
        } else {
          return undefined;
        }
      }
    } else {
      if (Array.isArray(current)) {
        // Map over array if current node is an array and token is property
        current = current.map(item => (item && typeof item === 'object' ? item[token] : undefined)).filter(v => v !== undefined);
      } else if (typeof current === 'object' && token in current) {
        current = current[token];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * Dot Path accessor with wildcard support:
 * e.g., "data.items.0.name" or "items.*.title"
 */
function evaluateDotPath(data: any, pathStr: string): any {
  let cleanPath = pathStr.trim();
  if (cleanPath.startsWith('data.')) {
    cleanPath = cleanPath.slice(5);
  } else if (cleanPath === 'data' || cleanPath === '*' || !cleanPath) {
    return data;
  }

  if (!cleanPath) return data;

  const parts = cleanPath.split('.');
  let current: any = data;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;

    if (part === '*') {
      if (Array.isArray(current)) {
        return current;
      } else if (typeof current === 'object') {
        return Object.values(current);
      }
    } else if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (!isNaN(idx)) {
        current = current[idx];
      } else {
        current = current
          .map(item => (item && typeof item === 'object' ? item[part] : undefined))
          .filter(v => v !== undefined);
      }
    } else if (typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

export function evaluateQuery(data: any, query: string, type: FilterType): QueryResult {
  if (!query.trim()) {
    return { success: true, result: data };
  }

  try {
    if (type === 'jmespath') {
      const res = jmespath.search(data, query);
      return { success: true, result: res };
    }

    if (type === 'jsonpath') {
      const res = evaluateJsonPath(data, query);
      return { success: true, result: res };
    }

    if (type === 'dotpath') {
      const res = evaluateDotPath(data, query);
      return { success: true, result: res };
    }

    if ((type as string) === 'javascript') {
      return {
        success: false,
        error: 'Arbitrary JavaScript execution is disabled for privacy and security. Please use JMESPath, JSONPath, or DotPath.',
      };
    }

    return { success: false, error: `Unsupported filter type: ${type}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || 'Query execution error' };
  }
}
