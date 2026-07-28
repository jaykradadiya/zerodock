import React, { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Minimize2,
  Wrench,
  LayoutTemplate,
  TableProperties,
  Filter,
  FileCode,
  Code2,
  Database,
  ShieldCheck,
  Settings2,
  Upload,
  Link as LinkIcon,
  Download,
  GitCompare,
  FileJson,
  Maximize,
  Minimize,
  ChevronDown,
} from 'lucide-react';
import type { SidePanel } from '../../../../shared/hooks/useToolkitPanel';
import { cn } from '../../../../shared/components/ui';

interface JsonToolbarProps {
  viewMode: 'editor' | 'compare';
  setViewMode: (mode: 'editor' | 'compare') => void;
  sidePanel: SidePanel;
  onSidePanelChange: (panel: SidePanel) => Promise<void>;
  isProcessing: boolean;
  activeTabId: string | null;
  onProcessJson: (action: 'format' | 'minify') => void;
  onRepairJson: () => void;
  showSchema: boolean;
  setShowSchema: (show: boolean) => void;
  // Options
  indent: number | 'tab';
  sortKeys: boolean;
  smartFormat: boolean;
  onIndentChange: (val: number | 'tab') => void;
  onSortKeysChange: (val: boolean) => void;
  onSmartFormatChange: (val: boolean) => void;
  // Compare view params
  tabs: Array<{ id: string; name: string }>;
  origDiffId: string;
  modDiffId: string;
  setOrigDiffId: (id: string) => void;
  setModDiffId: (id: string) => void;
  // File IO
  onOpenFileClick: () => void;
  onFetchUrl: () => void;
  onDownload: (format: 'json' | 'csv') => void;
  // Fullscreen
  isFullscreen: boolean;
  setIsFullscreen: (full: boolean) => void;
  embedded?: boolean;
}

export function JsonToolbar({
  viewMode,
  setViewMode,
  sidePanel,
  onSidePanelChange,
  isProcessing,
  activeTabId,
  onProcessJson,
  onRepairJson,
  showSchema,
  setShowSchema,
  indent,
  sortKeys,
  smartFormat,
  onIndentChange,
  onSortKeysChange,
  onSmartFormatChange,
  tabs,
  origDiffId,
  modDiffId,
  setOrigDiffId,
  setModDiffId,
  onOpenFileClick,
  onFetchUrl,
  onDownload,
  isFullscreen,
  setIsFullscreen,
  embedded = false,
}: JsonToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [optionsCoords, setOptionsCoords] = useState({ top: 0, left: 0 });
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleOptions = useCallback(() => {
    if (!showSettings && optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      setOptionsCoords({
        top: rect.bottom + 6,
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 270)),
      });
    }
    setShowSettings(!showSettings);
  }, [showSettings]);

  return (
    <div className="px-2.5 py-1.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/60 shrink-0 overflow-x-auto scrollbar-none select-none">
      <div className="flex items-center justify-between gap-3 min-w-max">
        {/* Left Cluster: Format Actions + View Panels */}
        <div className="flex items-center gap-2">
          {viewMode === 'editor' ? (
            <>
              {/* Primary Format Actions Group */}
              <div className="flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => onProcessJson('format')}
                  disabled={isProcessing || !activeTabId}
                  title="Format JSON (Cmd+Shift+F)"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--zd-primary)] text-white hover:opacity-95 transition-all disabled:opacity-50 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => onProcessJson('minify')}
                  disabled={isProcessing || !activeTabId}
                  title="Minify JSON"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors disabled:opacity-50"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Minify</span>
                </button>
                <button
                  type="button"
                  onClick={onRepairJson}
                  disabled={isProcessing || !activeTabId}
                  title="Repair malformed JSON"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors disabled:opacity-50"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Repair</span>
                </button>
              </div>

              <div className="h-4 w-px bg-[var(--zd-border)] mx-0.5" />

              {/* View Panels Segmented Switcher */}
              <div className="flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => onSidePanelChange('tree')}
                  title="Tree View Explorer"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    sidePanel === 'tree'
                      ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/50'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                  )}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Tree</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSidePanelChange('table')}
                  title="Table View"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    sidePanel === 'table'
                      ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/50'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                  )}
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSidePanelChange('path')}
                  title="JMESPath Query Tool"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    sidePanel === 'path'
                      ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/50'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Path</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSidePanelChange('yaml')}
                  title="YAML Converter"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                    sidePanel === 'yaml'
                      ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/50'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                  )}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>YAML</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSidePanelChange('types')}
                  disabled={!activeTabId}
                  title="TypeScript & Type Generator"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50',
                    sidePanel === 'types'
                      ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/50'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'
                  )}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Types</span>
                </button>
              </div>

              <div className="h-4 w-px bg-[var(--zd-border)] mx-0.5" />

              {/* Data Tools & Options Group */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSchema(!showSchema)}
                  title="Validate against JSON Schema"
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border border-[var(--zd-border)]/60 bg-[var(--zd-surface)]',
                    showSchema
                      ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/40 font-semibold'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Validate</span>
                </button>

                {/* Options Popover Button */}
                <button
                  type="button"
                  ref={optionsButtonRef}
                  onClick={toggleOptions}
                  title="Format options & Indentation"
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors border border-[var(--zd-border)]/60 bg-[var(--zd-surface)]',
                    showSettings
                      ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/40'
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
                  )}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Options</span>
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
                          <label className="text-xs font-semibold text-[var(--zd-text-primary)]">
                            Indentation
                          </label>
                          <select
                            value={indent.toString()}
                            onChange={(e) =>
                              onIndentChange(
                                e.target.value === 'tab' ? 'tab' : Number(e.target.value)
                              )
                            }
                            className="text-xs border border-[var(--zd-border)] rounded-lg bg-[var(--zd-surface)] text-[var(--zd-text-primary)] px-2 py-1 outline-none focus:border-[var(--zd-primary)]"
                          >
                            <option value="2">2 Spaces</option>
                            <option value="4">4 Spaces</option>
                            <option value="tab">Tab</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sortKeys}
                            onChange={(e) => onSortKeysChange(e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface)]"
                          />
                          <span className="text-xs font-medium text-[var(--zd-text-secondary)]">
                            Sort Object Keys
                          </span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={smartFormat}
                            onChange={(e) => onSmartFormatChange(e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface)]"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-[var(--zd-text-secondary)]">
                              Smart Format
                            </span>
                            <span className="text-[10px] text-[var(--zd-text-muted)]">
                              Collapse simple one-line arrays
                            </span>
                          </div>
                        </label>
                      </div>
                    </>,
                    document.body
                  )}
              </div>
            </>
          ) : (
            /* Compare Selectors */
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--zd-text-muted)] font-medium">Base:</span>
              <select
                value={origDiffId}
                onChange={(e) => setOrigDiffId(e.target.value)}
                className="text-xs bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg px-2 py-1 outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-[var(--zd-primary)] font-medium ml-1">Diff:</span>
              <select
                value={modDiffId}
                onChange={(e) => setModDiffId(e.target.value)}
                className="text-xs bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg px-2 py-1 outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Cluster: File Actions, Mode Switcher, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* File IO Group */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenFileClick}
              title="Open JSON or CSV files"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open</span>
            </button>
            <button
              type="button"
              onClick={onFetchUrl}
              title="Fetch remote JSON"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">URL</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                title="Export or Download"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {showDownloadMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[45]"
                    onClick={() => setShowDownloadMenu(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-md)] z-[50] p-1.5 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDownload('json');
                        setShowDownloadMenu(false);
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[var(--zd-text-primary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] font-medium text-left transition-colors"
                    >
                      <span>Save as JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDownload('csv');
                        setShowDownloadMenu(false);
                      }}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[var(--zd-text-primary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] font-medium text-left transition-colors"
                    >
                      <span>Export as CSV</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-4 w-px bg-[var(--zd-border)]" />

          {/* Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setViewMode('editor');
              }}
              title="Editor View"
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'editor'
                  ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)]'
              )}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!origDiffId && tabs.length > 0) setOrigDiffId(tabs[0].id);
                if (!modDiffId && tabs.length > 1) setModDiffId(tabs[1].id);
                else if (!modDiffId && tabs.length > 0) setModDiffId(tabs[0].id);
                setViewMode('compare');
                onSidePanelChange('hidden');
              }}
              title="Diff & Compare Tabs"
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'compare'
                  ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] font-semibold shadow-xs'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)]'
              )}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen'}
            className="p-1.5 rounded-lg text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
