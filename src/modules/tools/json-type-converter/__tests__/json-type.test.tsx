import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JsonTypeConverter from '../index';

// Mock CodeEditor since Monaco is hard to test in JSDOM
vi.mock('../../../shared/components/CodeEditor', () => ({
  CodeEditor: ({ value, onChange, readOnly }: any) => {
    return (
      <textarea 
        data-testid="mock-editor" 
        value={value} 
        onChange={(e) => onChange && onChange(e.target.value)} 
        readOnly={readOnly}
      />
    );
  }
}));

describe('JsonTypeConverter', () => {
  it('converts JSON to TypeScript', async () => {
    const user = userEvent.setup();
    render(<JsonTypeConverter />);
    
    const editors = screen.getAllByTestId('mock-editor');
    const inputEditor = editors[0];
    const outputEditor = editors[1] as HTMLTextAreaElement;
    
    await user.type(inputEditor, '{"name": "test"}');
    
    expect(outputEditor.value).toContain('export interface RootObject {');
    expect(outputEditor.value).toContain('name: string;');
  });

  it('handles invalid JSON gracefully', async () => {
    const user = userEvent.setup();
    render(<JsonTypeConverter />);
    
    const editors = screen.getAllByTestId('mock-editor');
    const inputEditor = editors[0];
    
    await user.type(inputEditor, '{ invalid }');
    
    expect(screen.getByText(/Invalid JSON Input:/)).toBeInTheDocument();
  });
});
