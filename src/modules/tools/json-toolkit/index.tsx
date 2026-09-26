import { useState, useEffect, useRef, useCallback } from 'react';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { ToolPage, ToolHeader, ToolWorkspace, MobileSwapBar } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { useToolkitPanel, type SidePanel } from '../../../shared/hooks/useToolkitPanel';
import { cn } from '../../../shared/components/ui';
import { FileJson } from 'lucide-react';
import { json2csv, csv2json } from 'csv42';
import type { WorkerMessage, WorkerError } from '../../../workers/base.worker';
import { SchemaPanel } from './components/SchemaPanel';
import { DiffView } from './components/DiffView';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import type { ValidationError } from './validate.worker';
import { useWorkspaceStore } from './store/workspaceStore';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { useToastStore } from '../../../core/store/useToastStore';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import { PathPanel } from './panels/PathPanel';
import { jsonToSchema } from './lib/jsonToTypes';
import { JsonTabBar } from './components/JsonTabBar';
import { JsonToolbar } from './components/JsonToolbar';
import { JsonStatusBar } from './components/JsonStatusBar';
import { monaco } from '../../../core/monaco/setup';

import JsonWorker from './json.worker.ts?worker';
import RepairWorker from './repair.worker.ts?worker';
import ValidateWorker from './validate.worker.ts?worker';

export default function JsonFormatter() {
  const workspace = useWorkspaceStore();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, getFileContent, updateTabContent, renameTab, isLoading } = workspace;
  const [sidePanel, setSidePanel] = useToolkitPanel('hidden');
  const [panelLayout, setPanelLayout] = useState<'full' | 'split'>('full');
  const [mobileFocus, setMobileFocus] = useState<'input' | 'output'>('input');

  const [error, setError] = useState<WorkerError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format options
  const [indent, setIndent] = useState<number | 'tab'>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [smartFormat, setSmartFormat] = useState(false);

  // Schema Validation
  const [schema, setSchema] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Compare Mode
  const [viewMode, setViewMode] = useState<'editor' | 'compare'>('editor');
  const [origDiffId, setOrigDiffId] = useState<string>('');
  const [modDiffId, setModDiffId] = useState<string>('');
  const [diffSideBySide, setDiffSideBySide] = useState<boolean>(true);
  const [diffIgnoreWhitespace, setDiffIgnoreWhitespace] = useState<boolean>(false);

  const handleSwapDiff = useCallback(() => {
    setOrigDiffId((prevOrig) => {
      setModDiffId(prevOrig);
      return modDiffId;
    });
  }, [modDiffId]);

  // Output Mode (Right Pane)
  const [activeTabContent, setActiveTabContent] = useState<string>('');

  // Tab renaming
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const repairWorkerRef = useRef<Worker | null>(null);
  const validateWorkerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<any>(null);
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyT') || ((e.metaKey || e.ctrlKey) && e.code === 'KeyM')) {
        e.preventDefault();
        e.stopPropagation();
        addTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [addTab]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Apply pipelined JSON from other tools non-destructively
  useEffect(() => {
    const payload = usePipelineStore.getState().consumePipelinePayload();
    if (!payload?.data) return;

    const applyPiped = async () => {
      const pipedData = payload.data;
      const currentContent = activeTabId ? await getFileContent(activeTabId) : '';
      const isCurrentEmpty = !currentContent || currentContent.trim() === '';

      let targetTabId = activeTabId;

      if (isCurrentEmpty && activeTabId) {
        // Active tab is empty: safe to populate directly
        await updateTabContent(activeTabId, pipedData);
        renameTab(activeTabId, 'piped.json');
      } else {
        // Active tab has unsaved content: create a new tab to avoid data loss
        targetTabId = await addTab('piped.json', pipedData);
        setActiveTab(targetTabId);
      }

      setActiveTabContent(pipedData);
      if (editorRef.current?.setValue) {
        editorRef.current.setValue(pipedData);
      }

      const sourceName = payload.sourceToolName || 'pipeline';
      useToastStore.getState().addToast(`Loaded data from ${sourceName} into "piped.json"`, 'info');
    };

    applyPiped();
  }, [activeTabId, addTab, getFileContent, renameTab, setActiveTab, updateTabContent]);

  const handleSidePanelChange = async (panel: SidePanel) => {
    try {
      if (panel !== 'hidden' && panel === sidePanel) {
        setSidePanel('hidden');
        setMobileFocus('input');
        return;
      }

      if (panel === 'hidden') {
        setSidePanel('hidden');
        setMobileFocus('input');
        return;
      }

      if (panel === 'tree' || panel === 'table') {
        const tab = workspace.tabs.find(t => t.id === activeTabId);
        if (tab && tab.size > 5 * 1024 * 1024) {
          alert('Tree and Table views are disabled for files larger than 5MB to prevent browser freezing.');
          return;
        }
      }

      setSidePanel(panel);
      setMobileFocus('output');

      let content = '';
      if (editorRef.current && typeof editorRef.current.getValue === 'function') {
        content = editorRef.current.getValue() || '';
      } else if (activeTabContent) {
        content = activeTabContent;
      } else if (activeTabId) {
        content = await getFileContent(activeTabId);
      }

      setActiveTabContent(content);
    } catch (err) {
      console.error('Error changing side panel:', err);
    }
  };

  const urlRestoredRef = useRef(false);

  // Sync activeTabContent when switching tabs
  useEffect(() => {
    if (activeTabId && urlRestoredRef.current) {
      getFileContent(activeTabId).then(setActiveTabContent);
    }
  }, [activeTabId, getFileContent]);

  const syncTimeoutRef = useRef<any>(null);
  const handleEditorChange = (val?: string) => {
    if (val !== undefined) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setActiveTabContent(val);
      }, 500);
    }
  };

  // Initialize Workspace and restore URL state
  useEffect(() => {
    const initWorkspace = async () => {
      await workspace.initialize();
      const urlState = getStateFromURL<{
        content?: string;
        indent?: number | 'tab';
        sortKeys?: boolean;
        smartFormat?: boolean;
      }>();
      if (urlState) {
        if (urlState.indent !== undefined) setIndent(urlState.indent);
        if (urlState.sortKeys !== undefined) setSortKeys(urlState.sortKeys);
        if (urlState.smartFormat !== undefined) setSmartFormat(urlState.smartFormat);
      }
    };
    initWorkspace();
  }, []);

  // Restore URL content into active tab once initialized or load active tab content on tab switch
  useEffect(() => {
    if (!isLoading && activeTabId) {
      let isMounted = true;
      if (!urlRestoredRef.current) {
        urlRestoredRef.current = true;
        const urlState = getStateFromURL<{ content?: string }>();
        if (urlState?.content) {
          updateTabContent(activeTabId, urlState.content).then(() => {
            if (!isMounted) return;
            setActiveTabContent(urlState.content!);
            if (editorRef.current?.setValue) {
              editorRef.current.setValue(urlState.content!);
            }
          });
          return;
        }
      }

      getFileContent(activeTabId).then((content) => {
        if (!isMounted) return;
        setActiveTabContent(content);
        if (editorRef.current?.setValue) {
          editorRef.current.setValue(content);
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isLoading, activeTabId, getFileContent, updateTabContent]);

  // Sync state to URL
  useEffect(() => {
    if (!isLoading && activeTabContent && activeTabContent.length < 30000) {
      updateURLWithState({
        content: activeTabContent,
        indent,
        sortKeys,
        smartFormat
      });
    }
  }, [activeTabContent, indent, sortKeys, smartFormat, isLoading]);

  const applyEditToEditor = useCallback((newText: string) => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        editorRef.current.pushUndoStop();
        editorRef.current.executeEdits('formatter', [{
          range: model.getFullModelRange(),
          text: newText
        }]);
        editorRef.current.pushUndoStop();
      }
    } else if (activeTabIdRef.current) {
      updateTabContent(activeTabIdRef.current, newText);
    }
  }, [updateTabContent]);

  useEffect(() => {
    try {
      workerRef.current = new JsonWorker();
      workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        setIsProcessing(false);
        if (e.data.type === 'SUCCESS') {
          applyEditToEditor(e.data.payload);
          setError(null);
        } else if (e.data.type === 'ERROR') {
          setError(e.data.payload);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize JsonWorker:', err);
    }

    try {
      repairWorkerRef.current = new RepairWorker();
      repairWorkerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        setIsProcessing(false);
        if (e.data.type === 'SUCCESS') {
          applyEditToEditor(e.data.payload);
          setError(null);
        } else if (e.data.type === 'ERROR') {
          setError(e.data.payload);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize RepairWorker:', err);
    }

    try {
      validateWorkerRef.current = new ValidateWorker();
      validateWorkerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
        setIsValidating(false);
        if (e.data.type === 'SUCCESS') {
          setValidationErrors(e.data.payload);
        } else if (e.data.type === 'ERROR') {
          setValidationErrors([{
            path: '/',
            message: e.data.payload.message,
            keyword: 'error',
            line: e.data.payload.line || 1,
            column: e.data.payload.column || 1,
          }]);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize ValidateWorker:', err);
    }

    return () => {
      workerRef.current?.terminate();
      repairWorkerRef.current?.terminate();
      validateWorkerRef.current?.terminate();
    };
  }, [applyEditToEditor]);

  // Schema validation trigger
  useEffect(() => {
    if (showSchema && schema.trim() && activeTabId) {
      setIsValidating(true);
      const runValidation = async () => {
        const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
          ? editorRef.current.getValue()
          : await getFileContent(activeTabId);
        validateWorkerRef.current?.postMessage({
          id: crypto.randomUUID(),
          type: 'PROCESS',
          payload: { document: content, schema }
        });
      };
      runValidation();
    } else {
      setValidationErrors([]);
      setIsValidating(false);
    }
  }, [schema, showSchema, activeTabId, activeTabContent, getFileContent]);

  // Synchronize Monaco editor error squiggly markers with validation results
  useEffect(() => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    if (!showSchema || validationErrors.length === 0) {
      monaco.editor.setModelMarkers(model, 'json-schema-validation', []);
      return;
    }

    const lineCount = model.getLineCount();
    const markers = validationErrors
      .filter(err => err.line !== undefined && err.line > 0)
      .map(err => {
        const line = Math.min(err.line!, lineCount);
        const maxCol = model.getLineMaxColumn(line);
        const startCol = Math.min(Math.max(err.column || 1, 1), maxCol);
        const rawEndCol = err.endColumn || (startCol + 1);
        const endCol = Math.min(Math.max(rawEndCol, startCol + 1), maxCol);
        const endLine = err.endLine && err.endLine >= line ? Math.min(err.endLine, lineCount) : line;

        return {
          severity: monaco.MarkerSeverity.Error,
          message: `${err.path && err.path !== '/' ? err.path + ': ' : ''}${err.message}`,
          startLineNumber: line,
          startColumn: startCol,
          endLineNumber: endLine,
          endColumn: endCol,
        };
      });

    monaco.editor.setModelMarkers(model, 'json-schema-validation', markers);

    return () => {
      if (!model.isDisposed()) {
        monaco.editor.setModelMarkers(model, 'json-schema-validation', []);
      }
    };
  }, [showSchema, validationErrors, activeTabId]);

  const handleJumpToError = useCallback((err: ValidationError) => {
    if (!err.line) return;
    setMobileFocus('input');
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(err.line);
      editorRef.current.setPosition({
        lineNumber: err.line,
        column: err.column || 1,
      });
      editorRef.current.focus();
    }
  }, []);

  const handleInferSchema = useCallback(async () => {
    try {
      const content =
        editorRef.current && typeof editorRef.current.getValue === 'function'
          ? editorRef.current.getValue()
          : activeTabId
            ? await getFileContent(activeTabId)
            : activeTabContent;
      if (!content || !content.trim()) {
        useToastStore.getState().addToast('No JSON document to infer schema from', 'info');
        return;
      }
      const parsed = JSON.parse(content);
      const generated = jsonToSchema(parsed);
      setSchema(generated);
      useToastStore.getState().addToast('Schema generated from current JSON', 'success');
    } catch {
      useToastStore.getState().addToast('Invalid JSON: unable to infer schema', 'error');
    }
  }, [activeTabId, activeTabContent, getFileContent]);

  const handleToggleSchema = useCallback(async (open: boolean) => {
    if (open && !schema.trim()) {
      try {
        const content =
          editorRef.current && typeof editorRef.current.getValue === 'function'
            ? editorRef.current.getValue()
            : activeTabId
              ? await getFileContent(activeTabId)
              : activeTabContent;
        if (content && content.trim()) {
          const parsed = JSON.parse(content);
          const generated = jsonToSchema(parsed);
          setSchema(generated);
        }
      } catch {
        // ignore
      }
    }
    setShowSchema(open);
  }, [schema, activeTabId, activeTabContent, getFileContent]);

  const processJson = useCallback(async (
    action: 'format' | 'minify',
    overrides?: { indent?: number | 'tab'; sortKeys?: boolean; smartFormat?: boolean }
  ) => {
    if (!activeTabId) return;
    const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
      ? editorRef.current.getValue()
      : await getFileContent(activeTabId);
    if (!content.trim()) return;
    setIsProcessing(true);
    setError(null);
    workerRef.current?.postMessage({
      id: crypto.randomUUID(),
      type: 'PROCESS',
      payload: {
        code: content,
        action,
        indent: overrides?.indent ?? indent,
        sortKeys: overrides?.sortKeys ?? sortKeys,
        smartFormat: overrides?.smartFormat ?? smartFormat
      }
    });
  }, [activeTabId, indent, sortKeys, smartFormat, getFileContent]);

  const handleIndentChange = useCallback((val: number | 'tab') => {
    setIndent(val);
    if (viewMode === 'editor' && !error) {
      processJson('format', { indent: val });
    }
  }, [viewMode, error, processJson]);

  const handleSortKeysChange = useCallback((val: boolean) => {
    setSortKeys(val);
    if (viewMode === 'editor' && !error) {
      processJson('format', { sortKeys: val });
    }
  }, [viewMode, error, processJson]);

  const handleSmartFormatChange = useCallback((val: boolean) => {
    setSmartFormat(val);
    if (viewMode === 'editor' && !error) {
      processJson('format', { smartFormat: val });
    }
  }, [viewMode, error, processJson]);

  const repairJson = useCallback(async () => {
    if (!activeTabId) return;
    setIsProcessing(true);
    setError(null);
    const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
      ? editorRef.current.getValue()
      : await getFileContent(activeTabId);
    repairWorkerRef.current?.postMessage({
      id: crypto.randomUUID(),
      type: 'PROCESS',
      payload: { code: content }
    });
  }, [activeTabId, getFileContent]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach(file => readFile(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.csv')) {
        try {
          const jsonArr = csv2json(content);
          await addTab(file.name.replace('.csv', '.json'), JSON.stringify(jsonArr, null, 2));
        } catch (err: any) {
          setError({ message: `Failed to parse CSV: ${err.message}` });
        }
      } else {
        await addTab(file.name, content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(file => readFile(file));
  };

  const handleDownload = async (format: 'json' | 'csv') => {
    if (!activeTabId) return;
    const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
      ? editorRef.current.getValue()
      : await getFileContent(activeTabId);
    if (!content) return;
    
    let exportData = content;
    let mimeType = 'application/json';
    let ext = '.json';

    if (format === 'csv') {
      try {
        let parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          if (typeof parsed === 'object' && parsed !== null) {
            const arrays = Object.values(parsed).filter(v => Array.isArray(v));
            if (arrays.length === 1) parsed = arrays[0];
            else parsed = [parsed];
          } else {
            parsed = [{ value: parsed }];
          }
        }
        exportData = json2csv(parsed);
        mimeType = 'text/csv';
        ext = '.csv';
      } catch {
        alert('Cannot convert to CSV: Invalid JSON or not an array of objects.');
        return;
      }
    }

    const tabName = tabs.find(t => t.id === activeTabId)?.name || 'document';
    const filename = tabName.endsWith('.json') ? tabName.replace('.json', ext) : `${tabName}${ext}`;
    exportToFile(exportData, filename, mimeType);
  };


  const embedded = useToolEmbed();
  const sidePanelOpen = sidePanel !== 'hidden' && viewMode === 'editor';

  const workspaceShellClass = cn(
    'zd-tool-fill overflow-hidden transition-all duration-200 bg-[var(--zd-surface)] flex-1 min-h-0',
    embedded
      ? 'border-0 sm:border sm:border-[var(--zd-border)] sm:rounded-lg'
      : 'border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-md)]',
    isDragging && 'border-[var(--zd-primary)] ring-4 ring-[var(--zd-primary-soft)]',
    isFullscreen && 'fixed inset-0 z-[110] rounded-none border-none'
  );

  if (isLoading) {
    const loadingEl = (
      <div className="zd-tool-fill flex flex-col items-center justify-center gap-3 text-[var(--zd-text-muted)] bg-[var(--zd-surface)] rounded-xl border border-[var(--zd-border)] min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[var(--zd-primary)]/30 border-t-[var(--zd-primary)] rounded-full animate-spin" />
        <span className="text-sm">Loading workspace...</span>
      </div>
    );
    if (embedded) return <div className="zd-tool-fill">{loadingEl}</div>;
    return (
      <ToolPage fullWidth compact className="relative flex-1 min-h-0">
        <ToolHeader
          icon={FileJson}
          title="JSON Toolkit"
          description="Format, validate, repair, diff, and explore JSON in a multi-tab browser workspace."
          toolId="json-toolkit"
        />
        <ToolWorkspace className={workspaceShellClass}>
          {loadingEl}
        </ToolWorkspace>
      </ToolPage>
    );
  }

  const workspaceBody = (
    <div
      className="flex flex-col flex-1 min-h-0 h-full zd-tool-fill"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,application/json,.csv"
        className="hidden"
      />

      {/* Tabs Strip */}
      <JsonTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTab={setActiveTab}
        addTab={addTab}
        removeTab={removeTab}
        renameTab={renameTab}
        editingTabId={editingTabId}
        setEditingTabId={setEditingTabId}
        editingTabName={editingTabName}
        setEditingTabName={setEditingTabName}
      />

      {/* Action Toolbar */}
      <JsonToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        sidePanel={sidePanel}
        onSidePanelChange={handleSidePanelChange}
        panelLayout={panelLayout}
        onTogglePanelLayout={() => setPanelLayout(panelLayout === 'full' ? 'split' : 'full')}
        isProcessing={isProcessing}
        activeTabId={activeTabId}
        onProcessJson={processJson}
        onRepairJson={repairJson}
        showSchema={showSchema}
        setShowSchema={handleToggleSchema}
        indent={indent}
        sortKeys={sortKeys}
        smartFormat={smartFormat}
        onIndentChange={handleIndentChange}
        onSortKeysChange={handleSortKeysChange}
        onSmartFormatChange={handleSmartFormatChange}
        tabs={tabs}
        origDiffId={origDiffId}
        modDiffId={modDiffId}
        setOrigDiffId={setOrigDiffId}
        setModDiffId={setModDiffId}
        diffSideBySide={diffSideBySide}
        setDiffSideBySide={setDiffSideBySide}
        diffIgnoreWhitespace={diffIgnoreWhitespace}
        setDiffIgnoreWhitespace={setDiffIgnoreWhitespace}
        onOpenFileClick={() => fileInputRef.current?.click()}
        onDownload={handleDownload}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
      />

      {/* Workspace Editor Main Viewport */}
      <div className="flex flex-col flex-1 min-h-0 relative bg-[var(--zd-bg)] overflow-hidden">
        {sidePanelOpen && (
          <MobileSwapBar
            onSwap={() => setMobileFocus(mobileFocus === 'input' ? 'output' : 'input')}
            onFocusInput={() => setMobileFocus('input')}
            onFocusOutput={() => setMobileFocus('output')}
            activePanel={mobileFocus}
          />
        )}

        <div className="flex flex-col md:flex-row flex-1 min-h-0 relative">
          {showSchema && viewMode === 'editor' && (
            <SchemaPanel
              schema={schema}
              onChange={setSchema}
              errors={validationErrors}
              isValidating={isValidating}
              onClose={() => setShowSchema(false)}
              onInferSchema={handleInferSchema}
              onErrorClick={handleJumpToError}
            />
          )}

          {viewMode === 'compare' ? (
            <ErrorBoundary>
              {origDiffId && modDiffId ? (
                <DiffView
                  originalModelId={origDiffId}
                  modifiedModelId={modDiffId}
                  setOrigDiffId={setOrigDiffId}
                  setModDiffId={setModDiffId}
                  sideBySide={diffSideBySide}
                  ignoreWhitespace={diffIgnoreWhitespace}
                  tabs={tabs}
                  onSwap={handleSwapDiff}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)]">
                  Please open at least two tabs to compare
                </div>
              )}
            </ErrorBoundary>
          ) : (
            <>
              {/* Main Editor Pane: hidden in Full Mode when Tree, Table, or Path is active */}
              {(!sidePanelOpen || panelLayout === 'split') && (
                <div
                  className={cn(
                    'flex-1 flex flex-col min-h-0 min-w-0 h-full',
                    sidePanelOpen && panelLayout === 'split' && 'md:w-1/2',
                    sidePanelOpen && mobileFocus === 'output' && 'hidden md:flex'
                  )}
                >
                  {activeTabId ? (
                    <CodeEditor
                      modelId={activeTabId}
                      language="json"
                      editorRef={editorRef}
                      onChange={handleEditorChange}
                      className="h-full"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)] min-w-0">
                      No open tabs. Drag and drop JSON files here or click +
                    </div>
                  )}
                </div>
              )}

              {/* Right Side Panel / Full Panel (Tree, Table, Path) */}
              {sidePanelOpen && (
                <div
                  className={cn(
                    'flex flex-col min-h-0 bg-[var(--zd-surface)] h-full',
                    panelLayout === 'full' && (sidePanel === 'table' || sidePanel === 'tree' || sidePanel === 'path')
                      ? 'flex-1 w-full'
                      : 'w-full md:w-1/2 border-t md:border-t-0 md:border-l border-[var(--zd-border)]',
                    mobileFocus === 'input' && 'hidden md:flex'
                  )}
                >
                  <ErrorBoundary>
                    {sidePanel === 'tree' && (
                      <TreeView
                        jsonString={activeTabContent}
                        tabId={activeTabId || undefined}
                        panelLayout={panelLayout}
                        onToggleLayout={() => setPanelLayout(panelLayout === 'full' ? 'split' : 'full')}
                      />
                    )}
                    {sidePanel === 'table' && (
                      <TableView
                        jsonString={activeTabContent}
                        panelLayout={panelLayout}
                        onToggleLayout={() => setPanelLayout(panelLayout === 'full' ? 'split' : 'full')}
                      />
                    )}
                    {sidePanel === 'path' && (
                      <PathPanel
                        sourceJson={activeTabContent}
                        onClose={() => handleSidePanelChange('hidden')}
                        panelLayout={panelLayout}
                        onToggleLayout={() => setPanelLayout(panelLayout === 'full' ? 'split' : 'full')}
                      />
                    )}
                  </ErrorBoundary>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <JsonStatusBar
        content={activeTabContent}
        error={error}
        isProcessing={isProcessing}
        indent={indent}
        sortKeys={sortKeys}
        onIndentToggle={() =>
          handleIndentChange(indent === 2 ? 4 : indent === 4 ? 'tab' : 2)
        }
      />
    </div>
  );

  const workspaceContent = (
    <>
      {embedded ? (
        <div className={cn(workspaceShellClass, 'h-full')}>{workspaceBody}</div>
      ) : (
        <ToolWorkspace className={cn(workspaceShellClass, 'h-full')}>{workspaceBody}</ToolWorkspace>
      )}
    </>
  );

  if (embedded) return <div className="zd-tool-fill h-full">{workspaceContent}</div>;

  return (
    <ToolPage fullWidth compact className="relative flex-1 min-h-0 h-full !p-0">
      {workspaceContent}
    </ToolPage>
  );
}
