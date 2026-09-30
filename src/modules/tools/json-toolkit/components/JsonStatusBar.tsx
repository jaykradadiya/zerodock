import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type { WorkerError } from '../../../../workers/base.worker';

interface JsonStatusBarProps {
  content: string;
  error: WorkerError | null;
  isProcessing: boolean;
  indent: number | 'tab';
  sortKeys: boolean;
  onIndentToggle?: () => void;
}

export function JsonStatusBar({
  content,
  error,
  isProcessing,
  indent,
  sortKeys,
  onIndentToggle,
}: JsonStatusBarProps) {
  const metrics = useMemo(() => {
    if (!content) return { lines: 0, chars: 0, bytesFormatted: '0 B' };
    const lines = content.split('\n').length;
    const chars = content.length;
    const byteLength = new TextEncoder().encode(content).length;

    let bytesFormatted = `${byteLength} B`;
    if (byteLength >= 1024 * 1024) {
      bytesFormatted = `${(byteLength / (1024 * 1024)).toFixed(2)} MB`;
    } else if (byteLength >= 1024) {
      bytesFormatted = `${(byteLength / 1024).toFixed(1)} KB`;
    }

    return { lines, chars, bytesFormatted };
  }, [content]);

  const isValid = !error && !isProcessing && content.trim().length > 0;
  const isEmpty = !content.trim();

  return (
    <div className="h-7 px-3 bg-[var(--zd-surface-raised)] border-t border-[var(--zd-border)] flex items-center justify-between text-[11px] text-[var(--zd-text-muted)] shrink-0 select-none">
      {/* Left: Validation / Execution state */}
      <div className="flex items-center gap-2 min-w-0">
        {isProcessing ? (
          <div className="flex items-center gap-1.5 text-[var(--zd-primary)] font-medium">
            <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
            <span>Processing JSON...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-[var(--zd-accent)] font-medium truncate max-w-md">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">Syntax Error: {error.message}</span>
          </div>
        ) : isValid ? (
          <div className="flex items-center gap-1.5 text-[var(--zd-success)] font-medium">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Valid JSON</span>
          </div>
        ) : (
          <span className="text-[var(--zd-text-muted)]">Ready</span>
        )}
      </div>

      {/* Right: Line count, Byte size, Indentation & Shortcuts */}
      <div className="flex items-center gap-3 shrink-0">
        {!isEmpty && (
          <>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>
                {metrics.lines} lines • {metrics.bytesFormatted}
              </span>
            </div>
            <div className="h-3 w-px bg-[var(--zd-border)]" />
          </>
        )}

        {/* Indent Config Badge */}
        <button
          type="button"
          onClick={onIndentToggle}
          className="hover:text-[var(--zd-text-primary)] transition-colors focus:outline-none"
          title="Click to toggle indentation"
        >
          <span>
            {indent === 'tab' ? 'Tabs' : `${indent} Spaces`}
            {sortKeys ? ' (Sorted)' : ''}
          </span>
        </button>

        <div className="h-3 w-px bg-[var(--zd-border)] hidden sm:block" />

        {/* Shortcut hints */}
        <div className="hidden sm:flex items-center gap-2 text-[var(--zd-text-muted)]">
          <span className="flex items-center gap-0.5">
            <kbd className="px-1 py-0.2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded text-[10px]">
              Option+T
            </kbd>{' '}
            New Tab
          </span>
        </div>
      </div>
    </div>
  );
}
