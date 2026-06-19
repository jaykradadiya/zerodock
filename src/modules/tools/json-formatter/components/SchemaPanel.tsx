import { CodeEditor } from '../../../../shared/components/CodeEditor';
import { ShieldCheck, XCircle, CheckCircle2, X } from 'lucide-react';
import type { ValidationError } from '../validate.worker';

interface SchemaPanelProps {
  schema: string;
  onChange: (schema: string) => void;
  errors: ValidationError[];
  isValidating: boolean;
  onClose: () => void;
}

export function SchemaPanel({ schema, onChange, errors, isValidating, onClose }: SchemaPanelProps) {
  return (
    <div className="flex-1 flex flex-col border-r border-[var(--zd-border)] min-h-[200px] w-full max-w-sm shrink-0 bg-[var(--zd-surface-raised)]/30">
      <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          JSON Schema
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-[var(--zd-primary)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col border-b border-[var(--zd-border)]">
        <CodeEditor 
          value={schema} 
          onChange={(val) => onChange(val || '')} 
          language="json"
        />
      </div>

      <div className="h-48 overflow-y-auto bg-[var(--zd-surface)] shrink-0">
        <div className="sticky top-0 px-4 py-2 bg-[var(--zd-surface-raised)]/90 backdrop-blur-sm border-b border-[var(--zd-border)] text-xs font-semibold text-slate-500 uppercase tracking-wider z-10">
          Validation Results
        </div>
        
        <div className="p-4">
          {isValidating ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Validating...</div>
          ) : errors.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Valid against schema</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Found {errors.length} errors</span>
              </div>
              {errors.map((err, i) => (
                <div key={i} className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-2 rounded border border-red-100 dark:border-red-900/40">
                  <span className="font-mono text-xs bg-red-100 dark:bg-red-900/60 px-1 py-0.5 rounded mr-2">
                    {err.path || '/'}
                  </span>
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
