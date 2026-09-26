import { useState, useEffect } from 'react';
import YAML from 'yaml';
import { ArrowRightLeft } from 'lucide-react';
import { CodePanel } from '../../../../shared/components/CodePanel';
import { ModeToggle, ModeToggleGroup } from '../../../../shared/components/ToolLayout';
import { Button } from '../../../../shared/components/ui';
import { SidePanelShell } from './SidePanelShell';
import type { ToolkitPanelProps } from './types';

type Mode = 'json2yaml' | 'yaml2json';

export function YamlPanel({ sourceJson, onApplyJson, onClose }: ToolkitPanelProps) {
  const [mode, setMode] = useState<Mode>('json2yaml');
  const [yamlInput, setYamlInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'json2yaml') {
      setError(null);
      if (!sourceJson.trim()) {
        setOutput('');
        return;
      }
      try {
        const parsed = JSON.parse(sourceJson);
        setOutput(YAML.stringify(parsed));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid JSON';
        setError(message);
        setOutput('');
      }
    }
  }, [sourceJson, mode]);

  useEffect(() => {
    if (mode !== 'yaml2json') return;
    setError(null);
    if (!yamlInput.trim()) {
      setOutput('');
      return;
    }
    try {
      const parsed = YAML.parse(yamlInput);
      if (parsed === undefined) {
        setOutput('');
      } else {
        const jsonStr = JSON.stringify(parsed, null, 2);
        setOutput(jsonStr ?? 'null');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid YAML or circular reference';
      setError(message);
      setOutput('');
    }
  }, [yamlInput, mode]);

  const handleSwap = () => {
    if (mode === 'json2yaml') {
      setMode('yaml2json');
      setYamlInput(output || sourceJson);
    } else {
      setMode('json2yaml');
      if (output) onApplyJson?.(output);
    }
  };

  const toolbar = (
    <ModeToggleGroup className="ml-auto">
      <ModeToggle active={mode === 'json2yaml'} onClick={() => setMode('json2yaml')}>
        JSON → YAML
      </ModeToggle>
      <ModeToggle active={mode === 'yaml2json'} onClick={() => setMode('yaml2json')}>
        YAML → JSON
      </ModeToggle>
    </ModeToggleGroup>
  );

  return (
    <SidePanelShell
      title="YAML Converter"
      onClose={onClose ?? (() => {})}
      badge={
        mode === 'json2yaml' ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]">
            from editor
          </span>
        ) : null
      }
      toolbar={toolbar}
    >
      <div className="zd-tool-fill flex flex-col">
        {mode === 'yaml2json' ? (
          <CodePanel
            title="YAML Input"
            language="yaml"
            value={yamlInput}
            onChange={(val) => setYamlInput(val || '')}
            onClear={() => setYamlInput('')}
            borderBottom={false}
            showSendTo={false}
            className="flex-1"
          />
        ) : null}
        <CodePanel
          title={mode === 'json2yaml' ? 'YAML Output' : 'JSON Output'}
          language={mode === 'json2yaml' ? 'yaml' : 'json'}
          value={output}
          readOnly
          showSendTo={false}
          downloadFileName={mode === 'json2yaml' ? 'converted.yaml' : 'converted.json'}
          downloadMimeType={mode === 'json2yaml' ? 'text/yaml' : 'application/json'}
          error={error}
          placeholder="Result will appear here..."
          className="flex-1"
        />
        <div className="px-4 py-2 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 flex items-center gap-2">
          {mode === 'yaml2json' && output && onApplyJson && (
            <Button variant="primary" size="sm" onClick={() => onApplyJson(output)}>
              Apply to editor
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleSwap} className="ml-auto">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {mode === 'json2yaml' ? 'Edit YAML' : 'Back to JSON→YAML'}
          </Button>
        </div>
      </div>
    </SidePanelShell>
  );
}
