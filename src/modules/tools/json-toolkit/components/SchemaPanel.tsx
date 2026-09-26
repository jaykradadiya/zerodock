import { useState, useCallback } from 'react';
import { CodeEditor } from '../../../../shared/components/CodeEditor';
import { ShieldCheck, XCircle, CheckCircle2, X, Sparkles, Copy, Check } from 'lucide-react';
import type { ValidationError } from '../validate.worker';
import { useToastStore } from '../../../../core/store/useToastStore';
import { usePreferenceStore } from '../../../../core/store/usePreferenceStore';
import { playSound } from '../../../../shared/utils/sound';

interface SchemaPanelProps {
  schema: string;
  onChange: (schema: string) => void;
  errors: ValidationError[];
  isValidating: boolean;
  onClose: () => void;
  onInferSchema?: () => void;
}

export function SchemaPanel({
  schema,
  onChange,
  errors,
  isValidating,
  onClose,
  onInferSchema,
}: SchemaPanelProps) {
  const [copied, setCopied] = useState(false);
  const { soundEnabled } = usePreferenceStore();

  const handleCopySchema = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(schema);
      setCopied(true);
      if (soundEnabled) playSound('pop');
      useToastStore.getState().addToast('Schema copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy schema', err);
    }
  }, [schema, soundEnabled]);

  return (
    <div className="flex-1 flex flex-col border-r border-[var(--zd-border)] min-h-[220px] w-full md:w-96 max-w-lg shrink-0 bg-[var(--zd-surface)] z-10">
      {/* Header */}
      <div className="px-3.5 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--zd-primary)]" />
          <span className="text-xs font-semibold text-[var(--zd-text-primary)] tracking-wide">
            JSON Schema
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onInferSchema && (
            <button
              type="button"
              onClick={onInferSchema}
              title="Re-populate schema from current JSON document"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors shadow-xs"
            >
              <Sparkles className="w-3 h-3 text-[var(--zd-primary)]" />
              <span>Infer from JSON</span>
            </button>
          )}

          {schema && (
            <button
              type="button"
              onClick={handleCopySchema}
              title="Copy JSON Schema"
              className="p-1 rounded text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close validator"
            className="p-1 text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monaco Schema Editor */}
      <div className="flex-1 min-h-0 flex flex-col border-b border-[var(--zd-border)]">
        <CodeEditor
          value={schema}
          onChange={(val) => onChange(val || '')}
          language="json"
        />
      </div>

      {/* Validation Results Drawer */}
      <div className="h-44 overflow-y-auto bg-[var(--zd-surface-raised)]/40 shrink-0">
        <div className="sticky top-0 px-3.5 py-1.5 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] text-[11px] font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider z-10 flex items-center justify-between">
          <span>Validation Results</span>
          {isValidating && (
            <span className="text-[10px] text-[var(--zd-primary)] font-mono animate-pulse">Checking...</span>
          )}
        </div>

        <div className="p-3">
          {isValidating ? (
            <div className="text-xs text-[var(--zd-text-secondary)] animate-pulse">
              Validating document against schema...
            </div>
          ) : !schema.trim() ? (
            <div className="text-xs text-[var(--zd-text-muted)]">
              No schema defined. Click "Infer from JSON" to generate one.
            </div>
          ) : errors.length === 0 ? (
            <div className="flex items-center gap-2 text-[var(--zd-accent)] bg-[var(--zd-accent-soft)] p-2.5 rounded-lg border border-[var(--zd-accent)]/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold block">Valid Document</span>
                <span className="text-[11px] opacity-80">JSON matches schema successfully.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-rose-500 mb-1">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">Found {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}</span>
              </div>
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="text-xs bg-[var(--zd-surface)] text-[var(--zd-text-primary)] p-2 rounded-md border border-[var(--zd-border)] flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--zd-primary)]">
                    <span>Path:</span>
                    <span className="font-semibold bg-[var(--zd-primary-soft)] px-1 rounded">
                      {err.path || '/'}
                    </span>
                  </div>
                  <div className="text-[var(--zd-text-secondary)]">{err.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
