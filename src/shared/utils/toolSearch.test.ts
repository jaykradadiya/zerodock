import { describe, expect, it } from 'vitest';
import { toolRegistry } from '../../core/registry/tools';
import { validateToolRegistry } from '../../types/tool';
import { searchTools } from './toolSearch';

describe('tool registry discovery metadata', () => {
  it('contains valid relationship and processing declarations', () => {
    expect(() => validateToolRegistry(toolRegistry)).not.toThrow();
    expect(toolRegistry.every((tool) => tool.metadata.processing)).toBe(true);
  });

  it('ranks verified aliases and keywords deterministically', () => {
    expect(searchTools(toolRegistry, 'format json')[0]?.id).toBe('json-toolkit');
    expect(searchTools(toolRegistry, 'jmespath')[0]?.id).toBe('json-path');
  });
});
