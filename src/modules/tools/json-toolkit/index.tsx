import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { ToolPage, ToolHeader, ToolWorkspace, MobileSwapBar } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { useToolkitPanel, type SidePanel } from '../../../shared/hooks/useToolkitPanel';
import { cn } from '../../../shared/components/ui';
import { Play, Minimize2, AlertCircle, FileJson, Wrench, Settings2, ShieldCheck, GitCompare, Database, Upload, Download, Link as LinkIcon, Lock, TableProperties, Plus, X, LayoutTemplate, ChevronDown, Search, Code2, Maximize, Minimize, FileCode, Filter } from 'lucide-react';
import { json2csv, csv2json } from 'csv42';
import type { WorkerMessage, WorkerError } from '../../../workers/base.worker';
import { SchemaPanel } from './components/SchemaPanel';
import { DiffView } from './components/DiffView';
import { TreeView } from './components/TreeView';
import { TableView } from './components/TableView';
import { TransformModal } from './components/TransformModal';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';
import type { ValidationError } from './validate.worker';
import { useWorkspaceStore } from './store/workspaceStore';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import { YamlPanel } from './panels/YamlPanel';
import { TypesPanel } from './panels/TypesPanel';
import { PathPanel } from './panels/PathPanel';

import JsonWorker from './json.worker.ts?worker';
import RepairWorker from './repair.worker.ts?worker';
import ValidateWorker from './validate.worker.ts?worker';

export default function JsonFormatter() {
  const workspace = useWorkspaceStore();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, getFileContent, updateTabContent, renameTab, isLoading } = workspace;
  const [sidePanel, setSidePanel] = useToolkitPanel('hidden');
  const [mobileFocus, setMobileFocus] = useState<'input' | 'output'>('input');

  const [error, setError] = useState<WorkerError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format options
  const [indent, setIndent] = useState<number | 'tab'>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [smartFormat, setSmartFormat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [optionsCoords, setOptionsCoords] = useState({ top: 0, left: 0 });

  // Schema Validation
  const [schema, setSchema] = useState('');
  const [showSchema, setShowSchema] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Compare Mode
  const [viewMode, setViewMode] = useState<'editor' | 'compare'>('editor');
  const [origDiffId, setOrigDiffId] = useState<string>('');
  const [modDiffId, setModDiffId] = useState<string>('');

  // Output Mode (Right Pane)
  const [activeTabContent, setActiveTabContent] = useState<string>('');

  // Tab renaming
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  const [showTransform, setShowTransform] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+T (Option+T) or Cmd+M / Ctrl+M to add a new tab
      if ((e.altKey && e.code === 'KeyT') || ((e.metaKey || e.ctrlKey) && e.code === 'KeyM')) {
        e.preventDefault();
        e.stopPropagation();
        addTab(`Untitled-${tabs.length + 1}.json`, '');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [tabs.length, addTab]);

  // Tab list dropdown finder
  const tabDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTabs = tabs.filter(tab => 
    tab.name.toLowerCase().includes(tabSearchQuery.toLowerCase())
  );

  const workerRef = useRef<Worker | null>(null);
  const repairWorkerRef = useRef<Worker | null>(null);
  const validateWorkerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<any>(null); // To execute edits in Monaco directly
  const activeTabIdRef = useRef(activeTabId);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Apply pipelined JSON from other tools and open types panel
  useEffect(() => {
    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData && activeTabId) {
      const applyPiped = async () => {
        await updateTabContent(activeTabId, pipedData);
        setActiveTabContent(pipedData);
        if (editorRef.current?.setValue) {
          editorRef.current.setValue(pipedData);
        }
        await handleSidePanelChange('types');
      };
      applyPiped();
    }
  }, [activeTabId, updateTabContent]);

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

      if ((panel === 'tree' || panel === 'table')) {
        const tab = workspace.tabs.find(t => t.id === activeTabId);
        if (tab && tab.size > 5 * 1024 * 1024) {
          alert('Tree and Table views are disabled for files larger than 5MB to prevent browser freezing. Please use the Code Editor or Transform tools.');
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

  // Restore URL content into active tab once initialized
  useEffect(() => {
    if (!isLoading && activeTabId && !urlRestoredRef.current) {
      urlRestoredRef.current = true;
      const urlState = getStateFromURL<{ content?: string }>();
      if (urlState?.content) {
        updateTabContent(activeTabId, urlState.content).then(() => {
          setActiveTabContent(urlState.content!);
          if (editorRef.current?.setValue) {
            editorRef.current.setValue(urlState.content!);
          }
        });
      } else {
        getFileContent(activeTabId).then(setActiveTabContent);
      }
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
        editorRef.current.executeEdits("formatter", [{
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
    workerRef.current = new JsonWorker();
    repairWorkerRef.current = new RepairWorker();
    validateWorkerRef.current = new ValidateWorker();
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      setIsProcessing(false);
      if (e.data.type === 'SUCCESS') {
        applyEditToEditor(e.data.payload);
        setError(null);
      } else if (e.data.type === 'ERROR') {
        setError(e.data.payload);
      }
    };

    repairWorkerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      setIsProcessing(false);
      if (e.data.type === 'SUCCESS') {
        applyEditToEditor(e.data.payload);
        setError(null);
      } else if (e.data.type === 'ERROR') {
        setError(e.data.payload);
      }
    };

    validateWorkerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      setIsValidating(false);
      if (e.data.type === 'SUCCESS') {
        setValidationErrors(e.data.payload);
      } else if (e.data.type === 'ERROR') {
        setValidationErrors([{ path: '/', message: e.data.payload.message, keyword: 'error' }]);
      }
    };

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

  const toggleOptions = useCallback(() => {
    if (!showSettings && optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      setOptionsCoords({
        top: rect.bottom + 6,
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 270))
      });
    }
    setShowSettings(!showSettings);
  }, [showSettings]);

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
      } catch (err: any) {
        alert('Cannot convert to CSV: Invalid JSON or not an array of objects.');
        return;
      }
    }

    const tabName = tabs.find(t => t.id === activeTabId)?.name || 'document';
    const filename = tabName.endsWith('.json') ? tabName.replace('.json', ext) : `${tabName}${ext}`;
    exportToFile(exportData, filename, mimeType);
  };

  const handleFetchUrl = async () => {
    const url = prompt('Enter a URL to fetch JSON from:');
    if (!url) return;
    try {
      setIsProcessing(true);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      const tabName = url.split('/').pop() || 'fetched.json';
      await addTab(tabName, text);
      setError(null);
    } catch (err: any) {
      setError({ message: `Failed to fetch: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const openTypesPanel = async () => {
    if (!activeTabId) return;
    await handleSidePanelChange('types');
  };

  const applyJsonToEditor = async (json: string) => {
    if (!activeTabId) {
      await addTab('converted.json', json);
      return;
    }
    if (editorRef.current?.setValue) {
      editorRef.current.setValue(json);
    }
    await updateTabContent(activeTabId, json);
    setActiveTabContent(json);
  };

  const embedded = useToolEmbed();
  const sidePanelOpen = sidePanel !== 'hidden' && viewMode === 'editor';

  const fileIoActions = (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,application/json,.csv"
        className="hidden"
      />
      <button onClick={() => fileInputRef.current?.click()} title="Open files" className="toolbar-btn">
        <Upload className="w-4 h-4" /><span className="toolbar-label">Open</span>
      </button>
      <button onClick={handleFetchUrl} title="Fetch from URL" className="toolbar-btn">
        <LinkIcon className="w-4 h-4" /><span className="toolbar-label">URL</span>
      </button>
      <button onClick={() => handleDownload('json')} title="Download JSON" className="toolbar-btn">
        <Download className="w-4 h-4" /><span className="toolbar-label">Save</span>
      </button>
    </>
  );

  const headerEl = (
    <ToolHeader
      icon={FileJson}
      title="JSON Toolkit"
      description="Format, validate, and explore JSON — convert YAML, generate types, and query with JMESPath."
      badges={
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--zd-accent-soft)] border border-[var(--zd-accent)]/20 text-[var(--zd-accent)] text-xs font-semibold shadow-sm">
          <Lock className="w-3 h-3" />
          <span>100% Local</span>
        </div>
      }
      actions={
        <>
          <div className="flex items-center gap-1.5 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-xl">
            <input 
              type="file" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json,application/json,.csv" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Open Files"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Open</span>
            </button>
            <button
              onClick={handleFetchUrl}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Fetch from URL"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">URL</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Save active tab to Disk"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Export active tab to CSV"
            >
              <TableProperties className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>

          <div className="h-8 w-px bg-[var(--zd-border)] hidden sm:block" />

          <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'editor' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'}`}
            >
              Editor
            </button>
            <button
              onClick={() => {
                if (!origDiffId && tabs.length > 0) setOrigDiffId(tabs[0].id);
                if (!modDiffId && tabs.length > 1) setModDiffId(tabs[1].id);
                else if (!modDiffId && tabs.length > 0) setModDiffId(tabs[0].id);
                setViewMode('compare');
                setSidePanel('hidden');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'compare' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'}`}
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>
          </div>
        </>
      }
    />
  );

  const workspaceShellClass = cn(
    'zd-tool-fill overflow-hidden transition-[box-shadow,border-color,ring-color] duration-200',
    !embedded && 'shadow-[var(--zd-shadow-md)]',
    isDragging && 'border-[var(--zd-primary)] ring-4 ring-[var(--zd-primary-soft)]',
    isFullscreen && 'fixed inset-0 z-[110] rounded-none'
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
      <ToolPage fullWidth className="relative">
        {headerEl}
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
        <div className="flex items-center justify-between bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0">
          {/* Scrollable Tabs area */}
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] border-r border-[var(--zd-border)] cursor-pointer transition-colors ${activeTabId === tab.id ? 'bg-[var(--zd-surface)] border-t-2 border-t-[var(--zd-primary)]' : 'hover:bg-[var(--zd-primary-soft)]/20 border-t-2 border-t-transparent'}`}
              >
                <FileJson className={`w-3.5 h-3.5 ${activeTabId === tab.id ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'}`} />
                {editingTabId === tab.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingTabName}
                    onChange={(e) => setEditingTabName(e.target.value)}
                    onBlur={() => {
                      if (editingTabName.trim()) {
                        renameTab(tab.id, editingTabName.trim());
                      }
                      setEditingTabId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingTabName.trim()) {
                          renameTab(tab.id, editingTabName.trim());
                        }
                        setEditingTabId(null);
                      } else if (e.key === 'Escape') {
                        setEditingTabId(null);
                      }
                    }}
                    className="flex-1 w-full min-w-0 text-sm bg-transparent outline-none border-b-2 border-b-[var(--zd-primary)] focus:bg-[var(--zd-primary-soft)]/10 text-[var(--zd-text-primary)] font-medium px-1 py-0.5 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab.id);
                      setEditingTabName(tab.name);
                    }}
                    className={`text-sm truncate flex-1 ${activeTabId === tab.id ? 'text-[var(--zd-text-primary)] font-medium' : 'text-[var(--zd-text-secondary)]'}`}
                    title="Double click to rename"
                  >
                    {tab.name}
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                  className={`p-0.5 rounded hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] ${activeTabId === tab.id ? 'opacity-100 text-[var(--zd-text-muted)]' : 'opacity-0 group-hover:opacity-100 text-[var(--zd-text-muted)]'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Tabs Control Area */}
          <div className="flex items-center gap-1 px-2 border-l border-[var(--zd-border)] bg-[var(--zd-surface-raised)] h-full shrink-0 relative">
            <button 
              onClick={() => addTab(`Untitled ${tabs.length + 1}`, '')}
              className="p-2 text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] rounded-md transition-colors"
              title="Add Tab"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>

            {/* Tab dropdown search/finder */}
            {tabs.length > 0 && (
              <div className="relative flex items-center" ref={tabDropdownRef}>
                <button
                  onClick={() => {
                    setShowTabDropdown(!showTabDropdown);
                    setTabSearchQuery('');
                  }}
                  className={`p-2 rounded-md transition-colors text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] ${showTabDropdown ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)]' : ''}`}
                  title="Find tabs"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTabDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-50 p-2 flex flex-col gap-2 backdrop-blur-md bg-[var(--zd-surface-raised)]/95">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50 rounded-lg">
                      <Search className="w-3.5 h-3.5 text-[var(--zd-text-muted)]" />
                      <input 
                        type="text"
                        placeholder="Search tabs..."
                        value={tabSearchQuery}
                        onChange={(e) => setTabSearchQuery(e.target.value)}
                        className="bg-transparent text-xs w-full outline-none text-[var(--zd-text-primary)]"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                      {filteredTabs.length === 0 ? (
                        <span className="text-center text-xs text-[var(--zd-text-muted)] py-3">No tabs found</span>
                      ) : (
                        filteredTabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setShowTabDropdown(false);
                            }}
                            className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${activeTabId === tab.id ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold' : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'}`}
                          >
                            <FileJson className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate flex-1">{tab.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar — single scrollable row */}
        <div className="px-2 sm:px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {viewMode === 'editor' && (
              <>
                <button onClick={() => processJson('format')} disabled={isProcessing || !activeTabId} title="Format JSON" className="toolbar-btn toolbar-btn-primary">
                  <Play className="w-4 h-4" /><span className="toolbar-label">Format</span>
                </button>
                <button onClick={() => processJson('minify')} disabled={isProcessing || !activeTabId} title="Minify JSON" className="toolbar-btn">
                  <Minimize2 className="w-4 h-4" /><span className="toolbar-label">Minify</span>
                </button>
                <button onClick={repairJson} disabled={isProcessing || !activeTabId} title="Repair JSON" className="toolbar-btn">
                  <Wrench className="w-4 h-4" /><span className="toolbar-label">Repair</span>
                </button>

                <span className="toolbar-divider" />

                <button onClick={() => handleSidePanelChange('tree')} title="Tree view" className={`toolbar-btn ${sidePanel === 'tree' ? 'toolbar-btn-active' : ''}`}>
                  <LayoutTemplate className="w-4 h-4" /><span className="toolbar-label">Tree</span>
                </button>
                <button onClick={() => handleSidePanelChange('table')} title="Table view" className={`toolbar-btn ${sidePanel === 'table' ? 'toolbar-btn-active' : ''}`}>
                  <TableProperties className="w-4 h-4" /><span className="toolbar-label">Table</span>
                </button>
                <button onClick={() => handleSidePanelChange('path')} title="JSON Path query" className={`toolbar-btn ${sidePanel === 'path' ? 'toolbar-btn-active' : ''}`}>
                  <Filter className="w-4 h-4" /><span className="toolbar-label">Path</span>
                </button>

                <span className="toolbar-divider" />

                <button onClick={() => handleSidePanelChange('yaml')} title="YAML converter" className={`toolbar-btn ${sidePanel === 'yaml' ? 'toolbar-btn-active' : ''}`}>
                  <FileCode className="w-4 h-4" /><span className="toolbar-label">YAML</span>
                </button>
                <button onClick={openTypesPanel} disabled={!activeTabId} title="Generate types" className={`toolbar-btn ${sidePanel === 'types' ? 'toolbar-btn-active' : ''}`}>
                  <Code2 className="w-4 h-4" /><span className="toolbar-label">Types</span>
                </button>

                <span className="toolbar-divider" />

                <button onClick={() => setShowTransform(true)} disabled={isProcessing || !activeTabId} title="Transform data" className="toolbar-btn">
                  <Database className="w-4 h-4" /><span className="toolbar-label">Transform</span>
                </button>

                <button ref={optionsButtonRef} onClick={toggleOptions} title="Format options" className={`toolbar-btn ${showSettings ? 'toolbar-btn-active' : ''}`}>
                  <Settings2 className="w-4 h-4" /><span className="toolbar-label">Options</span>
                </button>
                {showSettings && typeof document !== 'undefined' && createPortal(
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setShowSettings(false)} aria-hidden />
                    <div 
                      style={{ top: optionsCoords.top, left: optionsCoords.left }}
                      className="fixed w-64 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-[101] p-4 flex flex-col gap-4 backdrop-blur-md bg-[var(--zd-surface-raised)]/95 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-[var(--zd-text-secondary)]">Indentation</label>
                        <select value={indent.toString()} onChange={(e) => handleIndentChange(e.target.value === 'tab' ? 'tab' : Number(e.target.value))} className="text-sm border border-[var(--zd-border)] rounded-lg bg-transparent text-[var(--zd-text-primary)] px-2.5 py-1.5 outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)]">
                          <option value="2">2 Spaces</option>
                          <option value="4">4 Spaces</option>
                          <option value="tab">Tab</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={sortKeys} onChange={(e) => handleSortKeysChange(e.target.checked)} className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface-raised)]" />
                        <span className="text-sm font-medium text-[var(--zd-text-secondary)]">Sort Object Keys</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={smartFormat} onChange={(e) => handleSmartFormatChange(e.target.checked)} className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface-raised)]" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--zd-text-secondary)]">Smart Format</span>
                          <span className="text-xs text-[var(--zd-text-secondary)]">Collapse simple arrays</span>
                        </div>
                      </label>
                    </div>
                  </>,
                  document.body
                )}

                <button onClick={() => setShowSchema(!showSchema)} title="Validate with JSON Schema" className={`toolbar-btn ${showSchema ? 'toolbar-btn-active' : ''}`}>
                  <ShieldCheck className="w-4 h-4" /><span className="toolbar-label">Validate</span>
                </button>
              </>
            )}

            {viewMode === 'compare' && (
              <>
                <span className="text-xs text-[var(--zd-text-secondary)] font-medium">Original</span>
                <select value={origDiffId} onChange={e => setOrigDiffId(e.target.value)} className="text-xs bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2 py-1 outline-none focus:border-[var(--zd-primary)]">
                  {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <span className="text-xs text-[var(--zd-primary)] font-medium ml-1">Modified</span>
                <select value={modDiffId} onChange={e => setModDiffId(e.target.value)} className="text-xs bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2 py-1 outline-none focus:border-[var(--zd-primary)]">
                  {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </>
            )}

            <span className="toolbar-divider" />

            {embedded && viewMode === 'editor' && fileIoActions}

            {viewMode === 'editor' && (
              <button
                onClick={() => {
                  if (!origDiffId && tabs.length > 0) setOrigDiffId(tabs[0].id);
                  if (!modDiffId && tabs.length > 1) setModDiffId(tabs[1].id);
                  else if (!modDiffId && tabs.length > 0) setModDiffId(tabs[0].id);
                  setViewMode('compare');
                  setSidePanel('hidden');
                  setMobileFocus('input');
                }}
                title="Compare tabs"
                className="toolbar-btn"
              >
                <GitCompare className="w-4 h-4" /><span className="toolbar-label">Compare</span>
              </button>
            )}

            {viewMode === 'compare' && (
              <button onClick={() => setViewMode('editor')} title="Back to editor" className="toolbar-btn toolbar-btn-active">
                <FileJson className="w-4 h-4" /><span className="toolbar-label">Editor</span>
              </button>
            )}

            <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="toolbar-btn">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="toolbar-label">{isFullscreen ? 'Exit' : 'Expand'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] px-6 py-3 flex items-start gap-3 shrink-0">
            <AlertCircle className="w-5 h-5 text-[var(--zd-accent)] shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--zd-text-primary)] flex-1">
              <span className="font-semibold text-[var(--zd-accent)]">Invalid JSON:</span> {error.message}
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 relative">
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
            />
          )}

          {viewMode === 'compare' ? (
            <ErrorBoundary>
              {origDiffId && modDiffId ? (
                <DiffView originalModelId={origDiffId} modifiedModelId={modDiffId} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)]">Please open at least two tabs to compare</div>
              )}
            </ErrorBoundary>
          ) : (
            <>
              {/* Main Editor Pane */}
              <div className={cn(
                'flex-1 flex flex-col min-h-0 min-w-0',
                sidePanelOpen && mobileFocus === 'output' && 'hidden md:flex'
              )}>
                {activeTabId ? (
                  <CodeEditor 
                    modelId={activeTabId} 
                    language="json"
                    editorRef={editorRef}
                    onChange={handleEditorChange}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] bg-[var(--zd-surface)] min-w-0">No open tabs. Drag and drop files here, or click +</div>
                )}
              </div>
              
              {/* Right side panel */}
              {sidePanelOpen && (
                <div className={cn(
                  'w-full md:w-1/2 flex flex-col min-h-0',
                  mobileFocus === 'input' && 'hidden md:flex'
                )}>
                  <ErrorBoundary>
                    {sidePanel === 'tree' && (
                      <TreeView jsonString={activeTabContent} tabId={activeTabId || undefined} />
                    )}
                    {sidePanel === 'table' && (
                      <TableView jsonString={activeTabContent} />
                    )}
                    {sidePanel === 'yaml' && (
                      <YamlPanel
                        sourceJson={activeTabContent}
                        onApplyJson={applyJsonToEditor}
                        onClose={() => handleSidePanelChange('hidden')}
                      />
                    )}
                    {sidePanel === 'types' && (
                      <TypesPanel
                        sourceJson={activeTabContent}
                        onClose={() => handleSidePanelChange('hidden')}
                      />
                    )}
                    {sidePanel === 'path' && (
                      <PathPanel
                        sourceJson={activeTabContent}
                        onClose={() => handleSidePanelChange('hidden')}
                      />
                    )}
                  </ErrorBoundary>
                </div>
              )}
            </>
          )}
          </div>
        </div>
    </div>
  );

  const workspaceContent = (
    <>
      {embedded ? (
        <div className={workspaceShellClass}>{workspaceBody}</div>
      ) : (
        <ToolWorkspace className={workspaceShellClass}>{workspaceBody}</ToolWorkspace>
      )}

      {showTransform && (
        <TransformModal 
          input={activeTabContent} 
          isOpen={showTransform} 
          onClose={() => setShowTransform(false)} 
          onApply={(result) => {
            applyEditToEditor(result);
            setShowTransform(false);
          }} 
        />
      )}
    </>
  );

  if (embedded) return <div className="zd-tool-fill">{workspaceContent}</div>;

  return (
    <ToolPage fullWidth className="relative">
      {headerEl}
      {workspaceContent}
    </ToolPage>
  );
}
