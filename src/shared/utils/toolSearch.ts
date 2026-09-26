import type { Tool } from '../../types/tool';
import { fuzzyMatch } from './fuzzySearch';

const normalize = (value: string) => value.trim().toLowerCase();

/** Deterministic tool ranking. Fuzzy matches are deliberately a distant fallback. */
export function searchTools(tools: Tool[], query: string): Tool[] {
  const q = normalize(query);
  if (!q) return tools;

  return tools
    .map((tool) => {
      const name = normalize(tool.name);
      const aliases = tool.metadata.aliases?.map(normalize) ?? [];
      const category = normalize(tool.category);
      const keywords = [...tool.metadata.tags, tool.metadata.description].map(normalize);
      let score = 0;
      if (name === q) score = 700;
      else if (aliases.includes(q)) score = 650;
      else if (name.startsWith(q) || aliases.some((alias) => alias.startsWith(q))) score = 500;
      else if (category === q || category.startsWith(q)) score = 400;
      else if (keywords.some((keyword) => keyword === q || keyword.startsWith(q))) score = 300;
      else if (fuzzyMatch(q, [name, ...aliases, category, ...keywords].join(' '))) score = 100;
      return { tool, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .map(({ tool }) => tool);
}
