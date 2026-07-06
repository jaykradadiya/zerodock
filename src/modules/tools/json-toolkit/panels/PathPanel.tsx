import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import jmespath from 'jmespath';
import { CodePanel } from '../../../../shared/components/CodePanel';
import { SidePanelShell } from './SidePanelShell';
import type { ToolkitPanelProps } from './types';

const DEFAULT_QUERY = 'users[?age > `25`].name';

export function PathPanel({ sourceJson, onClose }: ToolkitPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceJson.trim() || !query.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const parsedJson = JSON.parse(sourceJson);
        const result = jmespath.search(parsedJson, query);
        if (result === undefined) {
          setOutput('undefined (no match)');
        } else {
          setOutput(JSON.stringify(result, null, 2));
        }
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid JSON or Query';
        setError(message);
        setOutput('');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [sourceJson, query]);

  const toolbar = (
    <div className="flex items-center gap-2 flex-1 min-w-0 ml-2">
      <div className="w-7 h-7 rounded-full bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
        <Play className="w-3.5 h-3.5" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="users[?age > `25`].name"
        className="flex-1 min-w-0 px-3 py-1.5 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-xs font-mono focus:outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
      />
    </div>
  );

  return (
    <SidePanelShell
      title="JSON Path"
      onClose={onClose ?? (() => {})}
      badge={
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]">
          from editor
        </span>
      }
      toolbar={toolbar}
    >
      <CodePanel
        title="Query Result"
        language="json"
        value={output}
        readOnly
        error={error}
        placeholder="Enter a JMESPath expression above..."
        downloadFileName="filtered.json"
        downloadMimeType="application/json"
      />
    </SidePanelShell>
  );
}
