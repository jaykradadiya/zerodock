import { useRef } from 'react';
import { useUIStore } from '../../core/store/useUIStore';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Button, SectionLabel } from './ui';

export function StorageWarningModal() {
  const { storageWarning, closeStorageWarning } = useUIStore();
  const modalRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap(Boolean(storageWarning?.isOpen), modalRef);

  if (!storageWarning || !storageWarning.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[var(--zd-bg)]/70 backdrop-blur-sm p-4 zd-dot-grid">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={storageWarning.title}
        className="w-full max-w-md zd-workspace zd-glow-border focus:outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]">
          <div className="flex items-center gap-2 text-[var(--zd-warning)]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-[var(--zd-text-primary)] text-sm">{storageWarning.title}</h3>
          </div>
          <Button variant="icon" onClick={closeStorageWarning} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-[var(--zd-text-secondary)] leading-relaxed">
            {storageWarning.message}
          </p>
          
          {storageWarning.suggestions && storageWarning.suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Recommended Alternatives</SectionLabel>
              <ul className="flex flex-col gap-2">
                {storageWarning.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-[var(--zd-text-secondary)] flex items-start gap-2 bg-[var(--zd-surface-raised)] p-3 rounded-xl border border-[var(--zd-border)]">
                    <span className="font-bold text-[var(--zd-primary)] shrink-0 mt-0.5">•</span>
                    <span className="font-medium leading-relaxed">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--zd-border)] bg-[var(--zd-surface-raised)] flex justify-end">
          <Button variant="primary" onClick={closeStorageWarning}>
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
