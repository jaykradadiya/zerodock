import { useState, useEffect } from 'react';
import { CodePanel } from '../../../../shared/components/CodePanel';
import { ToolSelect } from '../../../../shared/components/ToolLayout';
import { SidePanelShell } from './SidePanelShell';
import {
  convertJsonToTypes,
  LANG_LABELS,
  type TargetLang,
} from '../lib/jsonToTypes';
import type { ToolkitPanelProps } from './types';

export function TypesPanel({ sourceJson, onClose }: ToolkitPanelProps) {
  const [targetLang, setTargetLang] = useState<TargetLang>('typescript');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { output: converted, error: err } = convertJsonToTypes(sourceJson, targetLang);
    setOutput(converted);
    setError(err);
  }, [sourceJson, targetLang]);

  const editorLang =
    targetLang === 'go' ? 'go' : targetLang === 'rust' ? 'rust' : targetLang === 'schema' ? 'json' : 'typescript';

  const ext =
    targetLang === 'typescript' ? 'ts' : targetLang === 'go' ? 'go' : targetLang === 'rust' ? 'rs' : 'json';

  const toolbar = (
    <ToolSelect
      value={targetLang}
      onChange={(e) => setTargetLang(e.target.value as TargetLang)}
      className="ml-auto"
    >
      <option value="typescript">TypeScript</option>
      <option value="go">Go</option>
      <option value="rust">Rust</option>
      <option value="schema">JSON Schema</option>
    </ToolSelect>
  );

  return (
    <SidePanelShell
      title="Generated Types"
      onClose={onClose ?? (() => {})}
      badge={
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]">
          from editor
        </span>
      }
      toolbar={toolbar}
    >
      <CodePanel
        title="Output"
        badge={LANG_LABELS[targetLang]}
        language={editorLang}
        value={output}
        readOnly
        error={error}
        placeholder="Types will appear here when editor JSON is valid..."
        downloadFileName={`types.${ext}`}
      />
    </SidePanelShell>
  );
}
