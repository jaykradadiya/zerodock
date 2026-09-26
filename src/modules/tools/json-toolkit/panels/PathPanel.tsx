import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { CodePanel } from '../../../../shared/components/CodePanel';
import { SidePanelShell } from './SidePanelShell';
import type { ToolkitPanelProps } from './types';
import { evaluateQuery, FILTER_TYPES, type FilterType } from '../lib/queryEngine';

export function PathPanel({ sourceJson, onClose }: ToolkitPanelProps) {
  const [filterType, setFilterType] = useState<FilterType>('jmespath');
  const [query, setQuery] = useState('data');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeOption = FILTER_TYPES.find(f => f.id === filterType) || FILTER_TYPES[0];

  const handleFilterTypeChange = (newType: FilterType) => {
    setFilterType(newType);
    const opt = FILTER_TYPES.find(f => f.id === newType);
    if (opt) setQuery(opt.defaultQuery);
  };

  useEffect(() => {
    if (!sourceJson.trim() || !query.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const parsedJson = JSON.parse(sourceJson);
        const res = evaluateQuery(parsedJson, query, filterType);
        
        if (!res.success) {
          setError(res.error || 'Evaluation failed');
          setOutput('');
        } else if (res.result === undefined) {
          setOutput('undefined (no match)');
          setError(null);
        } else {
          setOutput(JSON.stringify(res.result, null, 2));
          setError(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid JSON input';
        setError(message);
        setOutput('');
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [sourceJson, query, filterType]);

  const toolbar = (
    <div className="flex items-center gap-2 flex-1 min-w-0 ml-2">
      {/* Filter Type Selector */}
      <select
        value={filterType}
        onChange={(e) => handleFilterTypeChange(e.target.value as FilterType)}
        className="px-2 py-1 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-xs font-semibold text-[var(--zd-primary)] outline-none focus:border-[var(--zd-primary)] shrink-0 cursor-pointer"
      >
        {FILTER_TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Query Input */}
      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg focus-within:border-[var(--zd-primary)]">
        <Filter className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeOption.placeholder}
          className="w-full bg-transparent text-xs font-mono outline-none text-[var(--zd-text-primary)]"
        />
      </div>
    </div>
  );

  return (
    <SidePanelShell
      title="Path Query"
      onClose={onClose ?? (() => {})}
      badge={
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-medium">
          {activeOption.label}
        </span>
      }
      toolbar={toolbar}
    >
      <CodePanel
        title={`Query Result (${activeOption.label})`}
        language="json"
        value={output}
        readOnly
        showSendTo={false}
        error={error}
        placeholder={`Enter a ${activeOption.label} expression above...`}
        downloadFileName="filtered_query.json"
        downloadMimeType="application/json"
      />
    </SidePanelShell>
  );
}
