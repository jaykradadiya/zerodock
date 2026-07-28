import jmespath from 'jmespath';

export type FilterType = 'jmespath' | 'jsonpath' | 'dotpath' | 'javascript';

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
    placeholder: 'users[?age > `25`].name',
    description: 'Declarative query language for JSON (filters, projections, multi-selects)',
    defaultQuery: 'data',
  },
  {
    id: 'jsonpath',
    label: 'JSONPath',
    placeholder: '$.users[*].name or $..id',
    description: 'XPath-like syntax for JSON structures (supports $..recursive lookups)',
    defaultQuery: '$.data',
  },
  {
    id: 'dotpath',
    label: 'Dot Path',
    placeholder: 'data.users.0.email or items.*.id',
    description: 'Simple dot-separated property accessor with wildcard (*) support',
    defaultQuery: 'data',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    placeholder: 'return data.map(item => item.name);',
    description: 'Full JavaScript logic with filter, map, reduce, or custom functions',
    defaultQuery: 'return data;',
  },
];

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
  const tokens = cleanPath.match(/([^\.\[\]]+|\[\*\]|\[\d+\])/g) || [];
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
  } else if (cleanPath === 'data') {
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

    if (type === 'javascript') {
      const fn = new Function('data', query);
      const res = fn(data);
      return { success: true, result: res };
    }

    return { success: false, error: `Unsupported filter type: ${type}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Query execution error' };
  }
}
