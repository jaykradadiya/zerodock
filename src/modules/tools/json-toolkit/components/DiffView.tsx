import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DiffEditor } from '@monaco-editor/react';
import {
  ChevronUp,
  ChevronDown,
  Check,
  FileJson,
  ArrowLeftRight,
} from 'lucide-react';
import { usePreferenceStore } from '../../../../core/store/usePreferenceStore';
import { useWorkspaceStore } from '../../../../modules/tools/json-toolkit/store/workspaceStore';
import { MONACO_THEME_ID, applyTheme } from '../../../../core/theme/themeEngine';
import { cn } from '../../../../shared/components/ui';

interface DiffViewProps {
  original?: string;
  modified?: string;
  originalModelId?: string;
  modifiedModelId?: string;
  sideBySide?: boolean;
  ignoreWhitespace?: boolean;
  tabs?: Array<{ id: string; name: string }>;
  onSwap?: () => void;
  setOrigDiffId?: (id: string) => void;
  setModDiffId?: (id: string) => void;
}

export function DiffView({
  original,
  modified,
  originalModelId,
  modifiedModelId,
  sideBySide = true,
  ignoreWhitespace = false,
  tabs = [],
  onSwap,
  setOrigDiffId,
  setModDiffId,
}: DiffViewProps) {
  const getFileContent = useWorkspaceStore((s) => s.getFileContent);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const navigatorRef = useRef<any>(null);

  // Dropdown states for Base & Diff tab pickers
  const baseButtonRef = useRef<HTMLButtonElement | null>(null);
  const diffButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [showDiffDropdown, setShowDiffDropdown] = useState(false);
  const [baseCoords, setBaseCoords] = useState({ top: 0, left: 0 });
  const [diffCoords, setDiffCoords] = useState({ top: 0, right: 0 });

  const [diffStats, setDiffStats] = useState<{
    changesCount: number;
    addedLines: number;
    removedLines: number;
    isIdentical: boolean;
  }>({ changesCount: 0, addedLines: 0, removedLines: 0, isIdentical: false });

  const origTab = tabs.find((t) => t.id === originalModelId);
  const modTab = tabs.find((t) => t.id === modifiedModelId);

  const toggleBaseDropdown = () => {
    if (!showBaseDropdown && baseButtonRef.current) {
      const rect = baseButtonRef.current.getBoundingClientRect();
      setBaseCoords({
        top: rect.bottom + 6,
        left: Math.max(12, rect.left),
      });
      setShowBaseDropdown(true);
      setShowDiffDropdown(false);
    } else {
      setShowBaseDropdown(false);
    }
  };

  const toggleDiffDropdown = () => {
    if (!showDiffDropdown && diffButtonRef.current) {
      const rect = diffButtonRef.current.getBoundingClientRect();
      setDiffCoords({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
      setShowDiffDropdown(true);
      setShowBaseDropdown(false);
    } else {
      setShowDiffDropdown(false);
    }
  };

  const handleEditorWillMount = () => {
    const prefState = usePreferenceStore.getState();
    const activeTheme = prefState.getActiveTheme();
    applyTheme(activeTheme, prefState.themeOverrides, prefState.highContrast);
  };

  const updateDiffStatistics = useCallback((editor: any) => {
    if (!editor) return;
    try {
      const lineChanges = editor.getLineChanges();
      if (!lineChanges || lineChanges.length === 0) {
        setDiffStats({ changesCount: 0, addedLines: 0, removedLines: 0, isIdentical: true });
        return;
      }

      let added = 0;
      let removed = 0;

      for (const change of lineChanges) {
        const origCount =
          change.originalEndLineNumber > 0
            ? change.originalEndLineNumber - change.originalStartLineNumber + 1
            : 0;
        const modCount =
          change.modifiedEndLineNumber > 0
            ? change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1
            : 0;

        if (origCount === 0 && modCount > 0) {
          added += modCount;
        } else if (origCount > 0 && modCount === 0) {
          removed += origCount;
        } else {
          removed += origCount;
          added += modCount;
        }
      }

      setDiffStats({
        changesCount: lineChanges.length,
        addedLines: added,
        removedLines: removed,
        isIdentical: false,
      });
    } catch {
      // Ignore if editor not ready
    }
  }, []);

  const loadModels = useCallback(async () => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;

    if (originalModelId && modifiedModelId) {
      const origUri = monaco.Uri.parse(`file:///${originalModelId}.json`);
      const modUri = monaco.Uri.parse(`file:///${modifiedModelId}.json`);

      let origModel = monaco.editor.getModel(origUri);
      if (!origModel) {
        const origContent = await getFileContent(originalModelId);
        origModel = monaco.editor.createModel(origContent, 'json', origUri);
      }

      let modModel = monaco.editor.getModel(modUri);
      if (!modModel) {
        const modContent = await getFileContent(modifiedModelId);
        modModel = monaco.editor.createModel(modContent, 'json', modUri);
      }

      if (!editorRef.current || editorRef.current.isDisposed?.()) return;

      editorRef.current.setModel({
        original: origModel,
        modified: modModel,
      });

      setTimeout(() => {
        if (editorRef.current && !editorRef.current.isDisposed?.()) {
          updateDiffStatistics(editorRef.current);
        }
      }, 100);
    }
  }, [originalModelId, modifiedModelId, getFileContent, updateDiffStatistics]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      renderSideBySide: sideBySide,
      ignoreTrimWhitespace: ignoreWhitespace,
    });
  }, [sideBySide, ignoreWhitespace]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    try {
      navigatorRef.current = monaco.editor.createDiffNavigator(editor, {
        followsCaret: true,
        ignoreCharChanges: true,
      });
    } catch {
      // Fail gracefully if navigator unsupported
    }

    editor.onDidUpdateDiff(() => {
      updateDiffStatistics(editor);
    });

    loadModels();
  };

  const handleNextDiff = () => {
    if (navigatorRef.current) {
      navigatorRef.current.next();
    }
  };

  const handlePrevDiff = () => {
    if (navigatorRef.current) {
      navigatorRef.current.previous();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-xl shadow-xs">
      {/* Compare View Sub-Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] shrink-0 select-none text-xs gap-3">
        {/* Left: Original Base Tab Selector Dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            ref={baseButtonRef}
            type="button"
            onClick={toggleBaseDropdown}
            className={cn(
              'group flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs',
              showBaseDropdown
                ? 'bg-rose-500/10 border-rose-500/40 text-[var(--zd-text-primary)] ring-1 ring-rose-500/30'
                : 'bg-[var(--zd-surface-raised)] border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-rose-500/30 hover:bg-rose-500/5'
            )}
            title="Select Base (Original) File"
            aria-label="Select Base file"
            aria-expanded={showBaseDropdown}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)] shrink-0" />
            <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20 shrink-0">
              Base
            </span>
            <FileJson className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-semibold text-[var(--zd-text-primary)] truncate max-w-[160px] sm:max-w-[220px]">
              {origTab?.name || 'Select Base File'}
            </span>
            <ChevronDown className={cn('w-3 h-3 text-[var(--zd-text-muted)] transition-transform duration-200', showBaseDropdown && 'rotate-180 text-rose-400')} />
          </button>

          {/* Base Portal Dropdown Menu */}
          {showBaseDropdown &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[80]"
                  onClick={() => setShowBaseDropdown(false)}
                  aria-hidden
                />
                <div
                  style={{ top: `${baseCoords.top}px`, left: `${baseCoords.left}px` }}
                  className="fixed w-64 bg-[var(--zd-surface-raised)]/95 backdrop-blur-xl border border-[var(--zd-border-hover)] rounded-xl shadow-[var(--zd-shadow-lg)] z-[90] p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider border-b border-[var(--zd-border)]/60 flex items-center justify-between">
                    <span>Select Base File (Original)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </div>
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar py-1">
                    {tabs.map((tab) => {
                      const isCurrent = tab.id === originalModelId;
                      const isOpposite = tab.id === modifiedModelId;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setOrigDiffId?.(tab.id);
                            setShowBaseDropdown(false);
                          }}
                          className={cn(
                            'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer w-full text-left',
                            isCurrent
                              ? 'bg-rose-500/10 text-[var(--zd-text-primary)] font-semibold border border-rose-500/20'
                              : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface)] hover:text-[var(--zd-text-primary)]'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileJson className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate">{tab.name}</span>
                          </div>
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : isOpposite ? (
                            <span className="text-[10px] text-[var(--zd-text-muted)] font-mono shrink-0">Diff</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>,
              document.body
            )}
        </div>

        {/* Center: Swap Button, Difference Counter, Jump Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Swap Button */}
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              title="Swap Base and Diff sides (⇄)"
              aria-label="Swap sides"
              className="p-1.5 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-primary)]/40 hover:bg-[var(--zd-primary-soft)] transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Differences stats badge */}
          {diffStats.isIdentical ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Files are identical</span>
            </span>
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] px-2.5 py-0.5 rounded-full shadow-2xs">
              <span className="text-[var(--zd-text-secondary)] font-semibold">
                {diffStats.changesCount} {diffStats.changesCount === 1 ? 'difference' : 'differences'}
              </span>
              <div className="h-2.5 w-px bg-[var(--zd-border)]" />
              {diffStats.addedLines > 0 && (
                <span className="text-emerald-400 font-mono font-semibold">+{diffStats.addedLines}</span>
              )}
              {diffStats.removedLines > 0 && (
                <span className="text-rose-400 font-mono font-semibold">-{diffStats.removedLines}</span>
              )}
            </div>
          )}

          {/* Jump Previous / Next */}
          {!diffStats.isIdentical && diffStats.changesCount > 0 && (
            <div className="flex items-center gap-0.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-0.5 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDiff}
                title="Previous difference hunk (Shift+F7)"
                aria-label="Previous difference"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <div className="w-px h-3 bg-[var(--zd-border)]" />
              <button
                type="button"
                onClick={handleNextDiff}
                title="Next difference hunk (F7)"
                aria-label="Next difference"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface)] transition-colors cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Modified Diff Tab Selector Dropdown */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <button
            ref={diffButtonRef}
            type="button"
            onClick={toggleDiffDropdown}
            className={cn(
              'group flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs',
              showDiffDropdown
                ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--zd-text-primary)] ring-1 ring-emerald-500/30'
                : 'bg-[var(--zd-surface-raised)] border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-emerald-500/30 hover:bg-emerald-500/5'
            )}
            title="Select Diff (Modified) File"
            aria-label="Select Diff file"
            aria-expanded={showDiffDropdown}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] shrink-0" />
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 shrink-0">
              Diff
            </span>
            <FileJson className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-[var(--zd-text-primary)] truncate max-w-[160px] sm:max-w-[220px]">
              {modTab?.name || 'Select Diff File'}
            </span>
            <ChevronDown className={cn('w-3 h-3 text-[var(--zd-text-muted)] transition-transform duration-200', showDiffDropdown && 'rotate-180 text-emerald-400')} />
          </button>

          {/* Diff Portal Dropdown Menu */}
          {showDiffDropdown &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[80]"
                  onClick={() => setShowDiffDropdown(false)}
                  aria-hidden
                />
                <div
                  style={{ top: `${diffCoords.top}px`, right: `${diffCoords.right}px` }}
                  className="fixed w-64 bg-[var(--zd-surface-raised)]/95 backdrop-blur-xl border border-[var(--zd-border-hover)] rounded-xl shadow-[var(--zd-shadow-lg)] z-[90] p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-[var(--zd-border)]/60 flex items-center justify-between">
                    <span>Select Diff File (Modified)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar py-1">
                    {tabs.map((tab) => {
                      const isCurrent = tab.id === modifiedModelId;
                      const isOpposite = tab.id === originalModelId;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setModDiffId?.(tab.id);
                            setShowDiffDropdown(false);
                          }}
                          className={cn(
                            'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer w-full text-left',
                            isCurrent
                              ? 'bg-emerald-500/10 text-[var(--zd-text-primary)] font-semibold border border-emerald-500/20'
                              : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface)] hover:text-[var(--zd-text-primary)]'
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileJson className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{tab.name}</span>
                          </div>
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isOpposite ? (
                            <span className="text-[10px] text-[var(--zd-text-muted)] font-mono shrink-0">Base</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>,
              document.body
            )}
        </div>
      </div>

      {/* Editor Viewport */}
      <div className="flex-1 min-h-0 relative" style={{ contain: 'layout size paint' }}>
        <DiffEditor
          height="100%"
          width="100%"
          language="json"
          original={!originalModelId ? original : undefined}
          modified={!modifiedModelId ? modified : undefined}
          theme={MONACO_THEME_ID}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
            readOnly: true,
            renderSideBySide: sideBySide,
            ignoreTrimWhitespace: ignoreWhitespace,
            smoothScrolling: true,
            scrollbar: {
              alwaysConsumeMouseWheel: true,
              vertical: 'visible',
            },
          }}
          loading={
            <div
              className="flex-1 h-full w-full flex bg-[var(--zd-surface)] font-mono text-xs select-none pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <div className="w-[51px] h-full border-r border-[var(--zd-border)]/40 bg-[var(--zd-surface-raised)]/20 py-4 px-2 text-[var(--zd-text-muted)]/40 text-right shrink-0">
                1<br />2<br />3
              </div>
              <div className="flex-1 p-4 text-[var(--zd-text-muted)]/50">
                Loading diff workspace...
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
