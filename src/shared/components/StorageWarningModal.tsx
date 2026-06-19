import { useGlobalStore } from '../../core/store/useGlobalStore';
import { AlertTriangle, X } from 'lucide-react';

export function StorageWarningModal() {
  const { storageWarning, closeStorageWarning } = useGlobalStore();

  if (!storageWarning || !storageWarning.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-md bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl shadow-[var(--zd-shadow-lg)] overflow-hidden flex flex-col focus:outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{storageWarning.title}</h3>
          </div>
          <button 
            onClick={closeStorageWarning}
            className="p-1 rounded hover:bg-[var(--zd-primary-soft)] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {storageWarning.message}
          </p>
          
          {storageWarning.suggestions && storageWarning.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recommended Alternatives
              </span>
              <ul className="flex flex-col gap-2">
                {storageWarning.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 bg-[var(--zd-surface-raised)]/50 p-3 rounded-xl border border-[var(--zd-border)]/50">
                    <span className="font-bold text-[var(--zd-primary)] shrink-0 mt-0.5">•</span>
                    <span className="font-medium leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 flex justify-end">
          <button
            onClick={closeStorageWarning}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--zd-primary)] hover:bg-[var(--zd-primary)]/90 text-white shadow-md hover:shadow-lg transition-all"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
