import { useState, useEffect, useRef } from 'react';
import { X, Play, Code2, Database, Filter, Layers, Sparkles } from 'lucide-react';
import { CodeEditor } from '../../../../shared/components/CodeEditor';
import type { WorkerMessage } from '../../../../workers/base.worker';
import TransformWorker from '../transform.worker.ts?worker';
import { FILTER_TYPES, type FilterType } from '../lib/queryEngine';

interface TransformModalProps {
  input: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: string) => void;
}

export function TransformModal({ input, isOpen, onClose, onApply }: TransformModalProps) {
  const [type, setType] = useState<FilterType>('jmespath');
  const [query, setQuery] = useState('data');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const activeOption = FILTER_TYPES.find((f) => f.id === type) || FILTER_TYPES[0];

  useEffect(() => {
    if (!isOpen) return;
    workerRef.current = new TransformWorker();

    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      setIsProcessing(false);
      if (e.data.type === 'SUCCESS') {
        setPreview(e.data.payload);
        setError(null);
      } else if (e.data.type === 'ERROR') {
        setError(e.data.payload.message);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [isOpen]);

  const handleTypeSwitch = (newType: FilterType) => {
    setType(newType);
    const opt = FILTER_TYPES.find((f) => f.id === newType);
    if (opt) setQuery(opt.defaultQuery);
  };

  useEffect(() => {
    if (!isOpen || !input.trim()) return;

    if (!query.trim()) {
      setPreview('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsProcessing(true);
      workerRef.current?.postMessage({
        id: crypto.randomUUID(),
        type: 'PROCESS',
        payload: { document: input, query, type },
      });
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [query, type, input, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--zd-bg)]/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--zd-surface-raised)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-lg)] w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--zd-border)] shrink-0 bg-[var(--zd-surface)]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--zd-primary)]" />
              <h2 className="text-lg font-bold text-[var(--zd-text-primary)] tracking-tight">
                Transform & Query Data
              </h2>
            </div>
            <p className="text-xs text-[var(--zd-text-muted)] mt-0.5">
              Query and reshape your JSON using JMESPath, JSONPath, Dot Path, or JavaScript expressions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] rounded-lg hover:bg-[var(--zd-primary-soft)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Filter Controls & Query Editor */}
          <div className="flex-1 flex flex-col border-r border-[var(--zd-border)] min-w-0 bg-[var(--zd-surface)]">
            {/* Filter Engine Tabs */}
            <div className="p-3 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0">
              <div className="flex items-center gap-1 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-1 rounded-xl overflow-x-auto scrollbar-none">
                {FILTER_TYPES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleTypeSwitch(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      type === f.id
                        ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] shadow-xs border border-[var(--zd-primary)]/20'
                        : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                    }`}
                  >
                    {f.id === 'jmespath' && <Database className="w-3.5 h-3.5" />}
                    {f.id === 'jsonpath' && <Filter className="w-3.5 h-3.5" />}
                    {f.id === 'dotpath' && <Layers className="w-3.5 h-3.5" />}
                    {f.id === 'javascript' && <Code2 className="w-3.5 h-3.5" />}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--zd-text-muted)] mt-2 px-1">
                {activeOption.description}
              </p>
            </div>

            {/* Query Input Area */}
            <div className="p-4 flex-1 flex flex-col gap-2 min-h-[180px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--zd-text-primary)]">
                  {activeOption.label} Query Expression
                </label>
                <span className="text-[11px] font-mono text-[var(--zd-text-muted)]">
                  Input variable: <code className="text-[var(--zd-primary)] font-semibold">data</code>
                </span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeOption.placeholder}
                className="flex-1 w-full bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-xl p-3 font-mono text-xs text-[var(--zd-text-primary)] focus:outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] resize-none"
              />
            </div>
          </div>

          {/* Right Column: Preview Pane */}
          <div className="flex-1 flex flex-col bg-[var(--zd-bg)] min-w-[320px]">
            <div className="px-4 py-3 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--zd-text-primary)] flex items-center gap-2">
                Transformation Preview
                {isProcessing && (
                  <span className="text-[11px] text-[var(--zd-primary)] animate-pulse font-normal">
                    (evaluating...)
                  </span>
                )}
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              {error ? (
                <div className="absolute inset-0 p-4 overflow-auto">
                  <div className="text-xs text-[var(--zd-accent)] bg-[var(--zd-accent-soft)]/20 p-3.5 rounded-xl border border-[var(--zd-accent)]/30 font-mono">
                    <span className="font-bold block mb-1">Query Error:</span>
                    <span>{error}</span>
                  </div>
                </div>
              ) : preview ? (
                <CodeEditor value={preview} readOnly language="json" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--zd-text-muted)] text-xs p-8 text-center">
                  Enter a valid {activeOption.label} expression to preview transformed output.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--zd-border)] flex justify-end gap-3 shrink-0 bg-[var(--zd-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(preview)}
            disabled={!preview || !!error || isProcessing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--zd-primary)] text-white hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--zd-shadow-sm)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Apply to Input
          </button>
        </div>
      </div>
    </div>
  );
}
