import React from 'react';
import { Trash2, Download, Sparkles, AlertCircle, FileInput } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { CopyButton } from './CopyButton';
import { SendToButton } from './SendToButton';
import { exportToFile } from '../utils/export';
import { useToolRoute } from '../context/ToolRouteContext';
import { Badge, Button, SectionLabel, Textarea, cn } from './ui';

export interface CodePanelProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  error?: string | null;
  icon?: React.ReactNode;
  value?: string;
  onChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  useTextarea?: boolean;
  showCopy?: boolean;
  onCopy?: () => void;
  onClear?: () => void;
  onSample?: () => void;
  onDownload?: () => void;
  downloadFileName?: string;
  downloadMimeType?: string;
  actions?: React.ReactNode;
  headerLeft?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  borderRight?: boolean;
  borderBottom?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  emptyMessage?: string;
  showSendTo?: boolean;
  sendToTargets?: { id: string; name: string; route: string }[];
}

function PanelPlaceholder({ message, isOutput }: { message: string; isOutput?: boolean }) {
  return (
    <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center p-6 text-center pointer-events-none">
      <div className="w-12 h-12 rounded-xl bg-[var(--zd-surface-raised)] border border-dashed border-[var(--zd-border)] flex items-center justify-center text-[var(--zd-text-muted)] mb-3">
        <FileInput className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-[var(--zd-text-secondary)]">{message}</p>
      {!isOutput && (
        <p className="text-xs text-[var(--zd-text-muted)] mt-1 font-mono">Paste · type · or load sample</p>
      )}
    </div>
  );
}

export function CodePanel({
  title,
  subtitle,
  badge,
  error,
  icon,
  value,
  onChange,
  language = 'json',
  readOnly = false,
  placeholder = 'Type or paste content here...',
  useTextarea = false,
  showCopy,
  onCopy,
  onClear,
  onSample,
  onDownload,
  downloadFileName,
  downloadMimeType = 'text/plain',
  actions,
  headerLeft,
  className = '',
  headerClassName = '',
  contentClassName = '',
  borderRight = false,
  borderBottom = false,
  footer,
  children,
  emptyMessage,
  showSendTo,
  sendToTargets,
}: CodePanelProps) {
  const toolRoute = useToolRoute();

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (value !== undefined && downloadFileName) {
      exportToFile(value, downloadFileName, downloadMimeType);
    }
  };

  const isEmpty = value !== undefined && !value.trim() && !children;
  const showPlaceholder = readOnly && isEmpty;
  const shouldShowCopy = showCopy !== undefined ? showCopy : (value !== undefined && value !== '');
  const hasDownload = Boolean(onDownload || (value !== undefined && downloadFileName));

  const resolvedSample = () => {
    if (onSample) {
      onSample();
      return;
    }
    const sample = toolRoute?.getSample();
    if (sample && onChange) onChange(sample);
  };
  const canSample = Boolean((onSample || toolRoute?.getSample()) && !readOnly);

  const pipelineTargets = sendToTargets ?? toolRoute?.pipelineTargets ?? [];
  const shouldShowSendTo = (showSendTo ?? readOnly) && value && value.trim() && pipelineTargets.length > 0;

  const borderClasses = [
    borderRight ? 'border-b md:border-b-0 md:border-r border-[var(--zd-border)]' : '',
    borderBottom ? 'border-b border-[var(--zd-border)]' : '',
  ].filter(Boolean).join(' ');

  const defaultEmptyMsg = readOnly
    ? 'Output will appear here'
    : 'Waiting for input';

  return (
    <div className={cn('zd-tool-fill bg-[var(--zd-surface)] overflow-hidden', borderClasses, className)}>
      <div
        className={cn(
          'px-4 py-2.5 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex flex-wrap items-center justify-between gap-2 min-h-[42px]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
          headerClassName
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-[var(--zd-primary)] shrink-0">{icon}</span>}
          <SectionLabel className="truncate">{title}</SectionLabel>
          {subtitle && (
            <span className="text-xs font-mono text-[var(--zd-text-secondary)] hidden sm:inline truncate">
              {subtitle}
            </span>
          )}
          {badge && <Badge>{badge}</Badge>}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-[var(--zd-error)] bg-[var(--zd-error-soft)] rounded-md border border-[var(--zd-error)]/25"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--zd-error)]" />
              <span className="truncate max-w-[200px] sm:max-w-[300px] font-mono">{error}</span>
            </div>
          )}
          {headerLeft}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {actions}

          {canSample && (
            <Button variant="secondary" size="sm" onClick={resolvedSample} title="Load sample data">
              <Sparkles className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
              <span>Sample</span>
            </Button>
          )}

          {onClear && !readOnly && value && (
            <Button variant="destructive" size="sm" onClick={onClear} title="Clear content">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}

          {hasDownload && value && (
            <Button variant="secondary" size="sm" onClick={handleDownload} title="Download file">
              <Download className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}

          {shouldShowSendTo && (
            <SendToButton data={value!} targets={pipelineTargets} />
          )}

          {shouldShowCopy && value && (
            <div className="flex items-center bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg px-2.5 py-1">
              {onCopy ? (
                <Button variant="ghost" size="sm" onClick={onCopy} className="!px-0 !py-0 !border-0">
                  Copy
                </Button>
              ) : (
                <CopyButton value={value} className="!text-[var(--zd-text-secondary)] hover:!text-[var(--zd-primary)] !font-semibold no-underline" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className={cn('zd-code-panel-body relative', contentClassName)}>
        {error && isEmpty ? (
          <div className="flex-1 h-full p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--zd-error-soft)] flex items-center justify-center text-[var(--zd-error)] mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[var(--zd-error)]">Processing Error</p>
            <p className="text-xs text-[var(--zd-error)]/80 mt-1.5 font-mono max-w-md whitespace-pre-wrap break-all">{error}</p>
          </div>
        ) : children ? (
          <div className="zd-tool-fill overflow-hidden">{children}</div>
        ) : useTextarea ? (
          <div className="zd-tool-fill relative">
            {showPlaceholder && <PanelPlaceholder message={emptyMessage || defaultEmptyMsg} isOutput={readOnly} />}
            <Textarea
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              readOnly={readOnly}
              placeholder={placeholder}
              className="absolute inset-0 w-full h-full p-4 resize-none"
            />
          </div>
        ) : (
          <div className="zd-tool-fill relative">
            {showPlaceholder && <PanelPlaceholder message={emptyMessage || defaultEmptyMsg} isOutput={readOnly} />}
            <CodeEditor
              value={value || ''}
              onChange={(val) => onChange?.(val || '')}
              language={language}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {footer && (
        <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-t border-[var(--zd-border)] shrink-0 text-xs font-mono text-[var(--zd-text-secondary)]">
          {footer}
        </div>
      )}
    </div>
  );
}
