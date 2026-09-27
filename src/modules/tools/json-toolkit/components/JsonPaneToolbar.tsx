import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Minimize2,
  Wrench,
  LayoutTemplate,
  TableProperties,
  Filter,
  ShieldCheck,
  Settings2,
  Check,
  Code2,
} from 'lucide-react';
import { cn } from '../../../../shared/components/ui';

export type PaneViewMode = 'editor' | 'tree' | 'table' | 'path';

export interface JsonPaneToolbarProps {
  paneId: 'primary' | 'secondary';
  activeTabId: string | null;
  isProcessing: boolean;
  onFormat: () => void;
  onMinify: () => void;
  onRepair: () => void;
  currentView: PaneViewMode;
  onViewChange: (view: PaneViewMode) => void;
  showSchema: boolean;
  onToggleSchema: () => void;
  indent: number | 'tab';
  sortKeys: boolean;
  smartFormat: boolean;
  onIndentChange: (val: number | 'tab') => void;
  onSortKeysChange: (val: boolean) => void;
  onSmartFormatChange: (val: boolean) => void;
  rightActions?: React.ReactNode;
}

export function JsonPaneToolbar({
  activeTabId,
  isProcessing,
  onFormat,
  onMinify,
  onRepair,
  currentView,
  onViewChange,
  showSchema,
  onToggleSchema,
  indent,
  sortKeys,
  smartFormat,
  onIndentChange,
  onSortKeysChange,
  onSmartFormatChange,
  rightActions,
}: JsonPaneToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [optionsCoords, setOptionsCoords] = useState({ top: 0, left: 0 });
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleOptions = useCallback(() => {
    if (!showSettings && optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      setOptionsCoords({
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 280)),
      });
      setShowSettings(true);
    } else {
      setShowSettings(false);
    }
  }, [showSettings]);

  const handleFormatClick = () => {
    if (currentView !== 'editor') {
      onViewChange('editor');
    }
    onFormat();
  };

  const handleMinifyClick = () => {
    if (currentView !== 'editor') {
      onViewChange('editor');
    }
    onMinify();
  };

  const handleRepairClick = () => {
    if (currentView !== 'editor') {
      onViewChange('editor');
    }
    onRepair();
  };

  return (
    <div className="px-2 py-1 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/60 shrink-0 overflow-x-auto scrollbar-none select-none">
      <div className="flex items-center justify-between gap-2 min-w-max">
        {/* Left Cluster: Format Actions + View Panels + Validate & Options */}
        <div className="flex items-center gap-1.5">
          {/* Primary Format Actions Group */}
          <div className="flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={handleFormatClick}
              disabled={isProcessing || !activeTabId}
              title="Format JSON (Cmd+Shift+F)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] hover:opacity-95 transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Format</span>
            </button>
            <button
              type="button"
              onClick={handleMinifyClick}
              disabled={isProcessing || !activeTabId}
              title="Minify JSON"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minify</span>
            </button>
            <button
              type="button"
              onClick={handleRepairClick}
              disabled={isProcessing || !activeTabId}
              title="Repair malformed JSON"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Repair</span>
            </button>
          </div>

          <div className="h-3.5 w-px bg-[var(--zd-border)] mx-0.5" />

          {/* View Panels Segmented Switcher */}
          <div className="flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg">
            {currentView !== 'editor' && (
              <button
                type="button"
                onClick={() => onViewChange('editor')}
                title="Switch back to Code Editor"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40 transition-all cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Code</span>
              </button>
            )}

            {(
              [
                { id: 'tree' as const, label: 'Tree', Icon: LayoutTemplate, title: 'Tree View Explorer' },
                { id: 'table' as const, label: 'Table', Icon: TableProperties, title: 'Table View' },
                { id: 'path' as const, label: 'Path', Icon: Filter, title: 'JMESPath Query Tool' },
              ] as const
            ).map(({ id, label, Icon, title }) => (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(currentView === id ? 'editor' : id)}
                title={`${title}${currentView === id ? ' (click to return to Code Editor)' : ''}`}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  currentView === id
                    ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-2xs border border-[var(--zd-border)]/50 ring-1 ring-[var(--zd-primary)]/40'
                    : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-[var(--zd-border)] mx-0.5" />

          {/* Data Tools & Options Group */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleSchema}
              title="Validate against JSON Schema"
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border border-[var(--zd-border)]/60 bg-[var(--zd-surface)] cursor-pointer',
                showSchema
                  ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/40 font-semibold'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Validate</span>
            </button>

            {/* Options Popover Button */}
            <button
              type="button"
              ref={optionsButtonRef}
              onClick={toggleOptions}
              title="Format options & Indentation"
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border border-[var(--zd-border)]/60 bg-[var(--zd-surface)] cursor-pointer',
                showSettings
                  ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/40'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
              )}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Options</span>
            </button>

            {showSettings &&
              typeof document !== 'undefined' &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowSettings(false)}
                    aria-hidden
                  />
                  <div
                    style={{ top: optionsCoords.top, left: optionsCoords.left }}
                    className="fixed w-64 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-[101] p-4 flex flex-col gap-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--zd-text-primary)]">Format Settings</span>
                      <button
                        type="button"
                        onClick={() => setShowSettings(false)}
                        className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>

                    {/* Indentation Selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium text-[var(--zd-text-secondary)]">Indentation</span>
                      <div className="flex items-center gap-1 bg-[var(--zd-surface)] p-1 rounded-lg border border-[var(--zd-border)]">
                        {[
                          { val: 2, label: '2 spaces' },
                          { val: 4, label: '4 spaces' },
                          { val: 'tab' as const, label: 'Tab' },
                        ].map((item) => (
                          <button
                            key={item.val.toString()}
                            type="button"
                            onClick={() => onIndentChange(item.val)}
                            className={cn(
                              'flex-1 text-xs py-1 rounded-md font-medium transition-colors cursor-pointer',
                              indent === item.val
                                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold shadow-2xs'
                                : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]'
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-[var(--zd-border)]/50">
                      <label className="flex items-center justify-between text-xs text-[var(--zd-text-secondary)] cursor-pointer select-none">
                        <span>Sort Object Keys</span>
                        <div
                          onClick={() => onSortKeysChange(!sortKeys)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            sortKeys
                              ? 'bg-[var(--zd-primary)] border-[var(--zd-primary)] text-[var(--zd-primary-foreground)]'
                              : 'border-[var(--zd-border)] bg-[var(--zd-surface)]'
                          )}
                        >
                          {sortKeys && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </label>

                      <label className="flex items-center justify-between text-xs text-[var(--zd-text-secondary)] cursor-pointer select-none">
                        <div>
                          <span>Smart Format</span>
                          <span className="block text-[10px] text-[var(--zd-text-muted)]">Single-line primitive arrays</span>
                        </div>
                        <div
                          onClick={() => onSmartFormatChange(!smartFormat)}
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            smartFormat
                              ? 'bg-[var(--zd-primary)] border-[var(--zd-primary)] text-[var(--zd-primary-foreground)]'
                              : 'border-[var(--zd-border)] bg-[var(--zd-surface)]'
                          )}
                        >
                          {smartFormat && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </label>
                    </div>
                  </div>
                </>,
                document.body
              )}
          </div>
        </div>

        {/* Right Cluster: Panes controls / actions if any */}
        {rightActions && <div className="flex items-center gap-1 shrink-0">{rightActions}</div>}
      </div>
    </div>
  );
}
