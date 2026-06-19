import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { Play, Minimize2, AlertCircle, FileJson, Wrench, Settings2, ShieldCheck, GitCompare, Database, Upload, Download, Link as LinkIcon, Lock, TableProperties, Plus, X, LayoutTemplate, ChevronDown, Search, Code2 } from 'lucide-react';
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

import JsonWorker from './json.worker.ts?worker';
import RepairWorker from './repair.worker.ts?worker';
import ValidateWorker from './validate.worker.ts?worker';

export default function JsonFormatter() {
  const navigate = useNavigate();
  const workspace = useWorkspaceStore();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, getFileContent, updateTabContent, renameTab, isLoading } = workspace;

  const [error, setError] = useState<WorkerError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format options
  const [indent, setIndent] = useState<number | 'tab'>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [smartFormat, setSmartFormat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
  const [outputMode, setOutputMode] = useState<'hidden' | 'tree' | 'table'>('hidden');
  const [activeTabContent, setActiveTabContent] = useState<string>(''); // For Tree/Table rendering

  // Tab renaming
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  const [showTransform, setShowTransform] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleOutputModeChange = async (mode: 'hidden' | 'tree' | 'table') => {
    try {
      if (mode === 'hidden') {
        setOutputMode('hidden');
        return;
      }

      const tab = workspace.tabs.find(t => t.id === activeTabId);
      if (tab && tab.size > 5 * 1024 * 1024) {
        alert('Tree and Table views are disabled for files larger than 5MB to prevent browser freezing. Please use the Code Editor or Transform tools.');
        return;
      }

      // Optimistically update UI
      setOutputMode(mode);

      let content = '';
      if (editorRef.current && typeof editorRef.current.getValue === 'function') {
        content = editorRef.current.getValue() || '';
      } else if (activeTabId) {
        content = await getFileContent(activeTabId);
      }
      
      setActiveTabContent(content);
    } catch (err) {
      console.error('Error changing output mode:', err);
    }
  };

  // Sync activeTabContent when switching tabs
  useEffect(() => {
    if (activeTabId && outputMode !== 'hidden') {
      getFileContent(activeTabId).then(setActiveTabContent);
    }
  }, [activeTabId]); // Deliberately omitting outputMode to prevent IDB overwrites on mode change

  // Live sync while typing (debounced)
  const syncTimeoutRef = useRef<any>(null);
  const handleEditorChange = (val?: string) => {
    if (outputMode !== 'hidden' && val !== undefined) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setActiveTabContent(val);
      }, 1000);
    }
  };

  // Initialize Workspace
  useEffect(() => {
    workspace.initialize();
  }, []);

  // Pipeline payload consumption
  const { payload: pipelinePayload, clearPipelineData } = usePipelineStore();
  useEffect(() => {
    if (pipelinePayload !== null) {
      addTab(`Imported_${tabs.length + 1}.json`, pipelinePayload).then(() => {
        clearPipelineData();
      }).catch(console.error);
    }
  }, [pipelinePayload]);

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
  }, [activeTabId]);

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
  }, [schema, showSchema, activeTabId, activeTabContent]);

  const applyEditToEditor = (newText: string) => {
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
    } else if (activeTabId) {
      updateTabContent(activeTabId, newText);
    }
  };

  const processJson = useCallback(async (action: 'format' | 'minify') => {
    if (!activeTabId) return;
    setIsProcessing(true);
    setError(null);
    const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
      ? editorRef.current.getValue()
      : await getFileContent(activeTabId);
    workerRef.current?.postMessage({
      id: crypto.randomUUID(),
      type: 'PROCESS',
      payload: { code: content, action, indent, sortKeys, smartFormat }
    });
  }, [activeTabId, indent, sortKeys, smartFormat]);

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
  }, [activeTabId]);

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

    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tabName = tabs.find(t => t.id === activeTabId)?.name || 'document';
    a.download = tabName.endsWith('.json') ? tabName.replace('.json', ext) : `${tabName}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
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

  const handlePipelineToTypes = async () => {
    if (!activeTabId) return;
    const content = (editorRef.current && typeof editorRef.current.getValue === 'function')
      ? editorRef.current.getValue()
      : await getFileContent(activeTabId);
    if (!content) return;
    
    // Set pipeline data
    usePipelineStore.getState().setPipelineData(content, 'json-formatter');
    // Navigate to Type Converter
    navigate({ to: '/json-type-converter' as any });
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Loading Workspace...</div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center p-4 xl:p-8 w-full h-full min-h-0 relative">
      
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Workspace</h1>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--zd-accent-soft)] border border-[var(--zd-accent)]/20 text-[var(--zd-accent)] text-xs font-semibold shadow-sm animate-pulse-glow">
                <Lock className="w-3 h-3" />
                <span>100% Local</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Handle multiple massive JSON files securely in-browser.</p>
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-4">
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Open Files"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Open</span>
            </button>
            <button
              onClick={handleFetchUrl}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Fetch from URL"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">URL</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Save active tab to Disk"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]"
              title="Export active tab to CSV"
            >
              <TableProperties className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>

          <div className="h-8 w-px bg-[var(--zd-border)]" />

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'editor' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'}`}
            >
              Editor
            </button>
            <button
              onClick={() => {
                if (!origDiffId && tabs.length > 0) setOrigDiffId(tabs[0].id);
                if (!modDiffId && tabs.length > 1) setModDiffId(tabs[1].id);
                else if (!modDiffId && tabs.length > 0) setModDiffId(tabs[0].id);
                setViewMode('compare');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'compare' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/40'}`}
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>
          </div>
        </div>
      </div>

      <div 
        className={`w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border ${isDragging ? 'border-[var(--zd-primary)] ring-4 ring-[var(--zd-primary-soft)]' : 'border-[var(--zd-border)]'} shadow-[var(--zd-shadow-md)] overflow-hidden transition-all`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {/* Workspace Tabs Bar Wrapper */}
        <div className="flex items-center justify-between bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0">
          {/* Scrollable Tabs area */}
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] border-r border-[var(--zd-border)] cursor-pointer transition-colors ${activeTabId === tab.id ? 'bg-[var(--zd-surface)] border-t-2 border-t-[var(--zd-primary)]' : 'hover:bg-[var(--zd-primary-soft)]/20 border-t-2 border-t-transparent'}`}
              >
                <FileJson className={`w-3.5 h-3.5 ${activeTabId === tab.id ? 'text-[var(--zd-primary)]' : 'text-slate-400'}`} />
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
                    className="flex-1 w-full min-w-0 text-sm bg-[var(--zd-surface-raised)] outline-none border border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] text-slate-900 dark:text-slate-100 font-medium px-1.5 py-0.5 rounded transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab.id);
                      setEditingTabName(tab.name);
                    }}
                    className={`text-sm truncate flex-1 ${activeTabId === tab.id ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Double click to rename"
                  >
                    {tab.name}
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                  className={`p-0.5 rounded hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] ${activeTabId === tab.id ? 'opacity-100 text-slate-500' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`}
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
              className="p-2 text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] rounded-md transition-colors"
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
                  className={`p-2 rounded-md transition-colors text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] ${showTabDropdown ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)]' : ''}`}
                  title="Find tabs"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTabDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-50 p-2 flex flex-col gap-2 backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50 rounded-lg">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search tabs..."
                        value={tabSearchQuery}
                        onChange={(e) => setTabSearchQuery(e.target.value)}
                        className="bg-transparent text-xs w-full outline-none text-slate-800 dark:text-slate-200"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                      {filteredTabs.length === 0 ? (
                        <span className="text-center text-xs text-slate-400 py-3">No tabs found</span>
                      ) : (
                        filteredTabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setShowTabDropdown(false);
                            }}
                            className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all ${activeTabId === tab.id ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'}`}
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

        {/* Action Controls Bar */}
        <div className="p-3 border-b border-[var(--zd-border)] flex items-center justify-between bg-[var(--zd-surface-raised)]/30 shrink-0">
          <div className="flex items-center gap-2">
            {viewMode === 'editor' && (
              <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-lg mr-2">
                <button onClick={() => processJson('format')} disabled={isProcessing || !activeTabId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--zd-surface)] text-[var(--zd-primary)] shadow-[var(--zd-shadow-sm)] hover:bg-[var(--zd-primary-soft)] hover:shadow-md transition-all disabled:opacity-50">
                  <Play className="w-4 h-4" /> Format
                </button>
                <button onClick={() => processJson('minify')} disabled={isProcessing || !activeTabId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all disabled:opacity-50">
                  <Minimize2 className="w-4 h-4" /> Minify
                </button>
                <button onClick={repairJson} disabled={isProcessing || !activeTabId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all disabled:opacity-50" title="Auto-repair broken JSON">
                  <Wrench className="w-4 h-4" /> Repair
                </button>
                <button onClick={() => setShowTransform(true)} disabled={isProcessing || !activeTabId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all disabled:opacity-50" title="Query or transform data">
                  <Database className="w-4 h-4" /> Transform
                </button>
                <button onClick={handlePipelineToTypes} disabled={!activeTabId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all disabled:opacity-50" title="Generate TypeScript/Go/Rust types from this JSON">
                  <Code2 className="w-4 h-4" /> Types
                </button>
              </div>
            )}
            
            {viewMode === 'compare' && (
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">Original:</span>
                  <select value={origDiffId} onChange={e => setOrigDiffId(e.target.value)} className="bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2.5 py-1 outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary-soft)]">
                    {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">Modified:</span>
                  <select value={modDiffId} onChange={e => setModDiffId(e.target.value)} className="bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2.5 py-1 outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary-soft)]">
                    {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {viewMode === 'editor' && (
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showSettings ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]' : 'text-slate-600 dark:text-slate-400 hover:bg-[var(--zd-primary-soft)]/50 hover:text-[var(--zd-primary)]'}`}>
                  <Settings2 className="w-4 h-4" /> Options
                </button>
                {showSettings && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-50 p-4 flex flex-col gap-4 backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Indentation</label>
                      <select value={indent.toString()} onChange={(e) => setIndent(e.target.value === 'tab' ? 'tab' : Number(e.target.value))} className="text-sm border border-[var(--zd-border)] rounded-lg bg-transparent text-slate-800 dark:text-slate-200 px-2.5 py-1.5 outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)]">
                        <option value="2">2 Spaces</option>
                        <option value="4">4 Spaces</option>
                        <option value="tab">Tab</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface-raised)]" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort Object Keys</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={smartFormat} onChange={(e) => setSmartFormat(e.target.checked)} className="w-4 h-4 rounded border-[var(--zd-border)] text-[var(--zd-primary)] focus:ring-[var(--zd-primary)] bg-[var(--zd-surface-raised)]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Smart Format</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Collapse simple arrays</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}
            
            {viewMode === 'editor' && (
              <button onClick={() => setShowSchema(!showSchema)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${showSchema ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)]' : 'text-slate-600 dark:text-slate-400 hover:bg-[var(--zd-primary-soft)]/50 hover:text-[var(--zd-primary)]'}`} title="Validate with JSON Schema">
                <ShieldCheck className="w-4 h-4" /> Validate
              </button>
            )}
          </div>
          
          {viewMode === 'editor' && (
            <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-lg">
              <button onClick={() => handleOutputModeChange('hidden')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${outputMode === 'hidden' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/30'}`}>
                Code
              </button>
              <button onClick={() => handleOutputModeChange('tree')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${outputMode === 'tree' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/30'}`}>
                <LayoutTemplate className="w-4 h-4" /> Tree
              </button>
              <button onClick={() => handleOutputModeChange('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${outputMode === 'table' ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' : 'text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]/30'}`}>
                <TableProperties className="w-4 h-4" /> Table
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/30 px-6 py-3 flex items-start gap-3 shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-300 flex-1">
              <span className="font-semibold">Invalid JSON:</span> {error.message}
            </div>
          </div>
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
                <div className="flex-1 flex items-center justify-center text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">Please open at least two tabs to compare</div>
              )}
            </ErrorBoundary>
          ) : (
            <>
              {/* Main Editor Pane */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {activeTabId ? (
                  <CodeEditor 
                    modelId={activeTabId} 
                    language="json"
                    editorRef={editorRef}
                    onChange={handleEditorChange}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 min-w-0">No open tabs. Drag and drop files here, or click +</div>
                )}
              </div>
              
              {/* Optional Right Pane (Tree / Table) */}
              {outputMode !== 'hidden' && (
                <div className="w-full md:w-1/2 flex flex-col border-t md:border-t-0 md:border-l border-[var(--zd-border)] min-h-[300px] md:min-h-0 bg-[var(--zd-surface-raised)]/20">
                  <div className="flex-1 min-h-0 flex flex-col">
                    <ErrorBoundary>
                      {outputMode === 'tree' && (
                        <TreeView jsonString={activeTabContent} tabId={activeTabId || undefined} />
                      )}
                      {outputMode === 'table' && (
                        <TableView jsonString={activeTabContent} />
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
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
    </div>
  );
}
