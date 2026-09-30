import { useMemo, useState, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Table as TableIcon,
  Copy,
  Check,
  Columns2,
  Maximize2,
} from 'lucide-react';
import { useToastStore } from '../../../../core/store/useToastStore';
import { usePreferenceStore } from '../../../../core/store/usePreferenceStore';
import { playSound } from '../../../../shared/utils/sound';
import { cn } from '../../../../shared/components/ui';

interface TableViewProps {
  jsonString: string;
  panelLayout?: 'full' | 'split';
  onToggleLayout?: () => void;
}

interface PathOption {
  label: string;
  path: string;
  value: unknown;
  dotPath: string;
}

// Recursively traverse JSON to collect paths of nested arrays and objects
function getPathOptions(value: unknown, path: string[] = [], depth = 0, options: PathOption[] = []): PathOption[] {
  if (value === null || typeof value !== 'object' || depth > 8) return options;

  const dotPath = path.join('.');
  const pathLabel = dotPath || 'Root Object';

  if (Array.isArray(value)) {
    options.push({
      label: path.length ? `${pathLabel} (Array)` : 'Root Array',
      path: JSON.stringify(path),
      value,
      dotPath,
    });
    if (value.length > 0 && value[0] && typeof value[0] === 'object') {
      Object.entries(value[0]).forEach(([key, val]) => {
        if (val && typeof val === 'object') {
          getPathOptions(val, [...path, '0', key], depth + 1, options);
        }
      });
    }
    return options;
  }

  // It's an object
  options.push({
    label: path.length ? `${pathLabel} (Object)` : 'Root Object',
    path: JSON.stringify(path),
    value,
    dotPath,
  });

  // Recurse into object properties
  Object.entries(value).forEach(([key, val]) => {
    if (val && typeof val === 'object') {
      getPathOptions(val, [...path, key], depth + 1, options);
    }
  });

  return options;
}

export function TableView({ jsonString, panelLayout = 'full', onToggleLayout }: TableViewProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('[]');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { soundEnabled } = usePreferenceStore();

  const handleCopy = useCallback(
    async (text: string, id: string, label = 'Copied to clipboard') => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        if (soundEnabled) playSound('pop');
        useToastStore.getState().addToast(label, 'success');
        setTimeout(() => {
          setCopiedId((curr) => (curr === id ? null : curr));
        }, 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    },
    [soundEnabled]
  );

  const parsedRoot = useMemo(() => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }, [jsonString]);

  const pathOptions = useMemo(() => {
    if (!parsedRoot) return [];
    return getPathOptions(parsedRoot);
  }, [parsedRoot]);

  // Extract selected node
  const selectedNode = useMemo(() => {
    if (!parsedRoot) return null;

    try {
      const parts = JSON.parse(selectedPath) as string[];
      if (parts.length === 0) return parsedRoot;

      let current = parsedRoot;
      for (const part of parts) {
        if (current === null || current === undefined) return null;
        current = current[part];
      }
      return current;
    } catch {
      return parsedRoot;
    }
  }, [parsedRoot, selectedPath]);

  const currentPathParts = useMemo(() => {
    try {
      return JSON.parse(selectedPath) as string[];
    } catch {
      return [];
    }
  }, [selectedPath]);

  const currentDotPath = useMemo(() => {
    return currentPathParts.join('.');
  }, [currentPathParts]);

  const stepInto = useCallback((keyOrIndex: string | string[]) => {
    const append = Array.isArray(keyOrIndex) ? keyOrIndex : [keyOrIndex];
    const nextParts = [...currentPathParts, ...append];
    setSelectedPath(JSON.stringify(nextParts));
    setSortCol(null);
    setSortDesc(false);
  }, [currentPathParts]);

  const stepOut = useCallback(() => {
    if (currentPathParts.length === 0) return;
    const nextParts = currentPathParts.slice(0, -1);
    setSelectedPath(JSON.stringify(nextParts));
    setSortCol(null);
    setSortDesc(false);
  }, [currentPathParts]);

  const jumpToBreadcrumb = useCallback((index: number) => {
    if (index === -1) {
      setSelectedPath('[]');
    } else {
      const nextParts = currentPathParts.slice(0, index + 1);
      setSelectedPath(JSON.stringify(nextParts));
    }
    setSortCol(null);
    setSortDesc(false);
  }, [currentPathParts]);

  const { data, columns, error } = useMemo(() => {
    if (!jsonString) {
      return { data: null, columns: [], error: 'No JSON to display', viewType: 'empty' };
    }
    if (parsedRoot === null) {
      return { data: null, columns: [], error: 'Invalid JSON format', viewType: 'error' };
    }
    if (selectedNode === null || selectedNode === undefined) {
      return { data: null, columns: [], error: 'Selected path not found', viewType: 'error' };
    }

    if (typeof selectedNode !== 'object') {
      return {
        data: [{ value: selectedNode }],
        columns: ['value'],
        error: null,
        viewType: 'primitive',
      };
    }

    if (Array.isArray(selectedNode)) {
      if (selectedNode.length === 0) {
        return { data: [], columns: [], error: null, viewType: 'empty_array' };
      }

      const isArrayOfObjects = selectedNode.every(
        (item) => item !== null && typeof item === 'object' && !Array.isArray(item)
      );
      if (!isArrayOfObjects) {
        const rows = selectedNode.map((val, idx) => ({
          index: idx + 1,
          value: val,
        }));
        return { data: rows, columns: ['index', 'value'], error: null, viewType: 'flat_array' };
      }

      const keySet = new Set<string>();
      selectedNode.forEach((obj) => {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach((k) => keySet.add(k));
        }
      });
      return { data: selectedNode, columns: Array.from(keySet), error: null, viewType: 'array_of_objects' };
    }

    // Single object -> key-value rows
    const rows = Object.entries(selectedNode).map(([key, val]) => ({
      key,
      value: val,
    }));
    return { data: rows, columns: ['key', 'value'], error: null, viewType: 'object' };
  }, [jsonString, parsedRoot, selectedNode]);

  const sortedData = useMemo(() => {
    if (!data || !sortCol) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      // Handle null/undefined
      if (valA === null || valA === undefined) return sortDesc ? 1 : -1;
      if (valB === null || valB === undefined) return sortDesc ? -1 : 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDesc ? valB - valA : valA - valB;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDesc ? 1 : -1;
      if (strA > strB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, sortCol, sortDesc]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDesc) {
        setSortCol(null); // cycle: asc -> desc -> off
        setSortDesc(false);
      } else {
        setSortDesc(true);
      }
    } else {
      setSortCol(col);
      setSortDesc(false);
    }
  };

  const renderCell = (value: unknown, drillInKey?: string) => {
    if (value === null) return <span className="text-[var(--zd-text-muted)] italic">null</span>;
    if (value === undefined) return <span className="text-[var(--zd-text-muted)]"></span>;
    if (typeof value === 'boolean') return <span className="text-[var(--zd-accent)] font-mono">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-[var(--zd-primary)] font-mono">{value}</span>;
    if (typeof value === 'object') {
      const isArray = Array.isArray(value);
      const label = isArray ? `[Array(${value.length})]` : `{Object}`;
      return (
        <button
          type="button"
          onClick={() => drillInKey !== undefined && stepInto(drillInKey)}
          title={`Click to step into ${drillInKey || 'this object'}`}
          className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] hover:bg-[var(--zd-primary)] hover:text-[var(--zd-primary-foreground)] transition-all cursor-pointer shadow-xs group/badge"
        >
          <span>{label}</span>
          <ChevronRight className="w-3 h-3 group-hover/badge:translate-x-0.5 transition-transform" />
        </button>
      );
    }
    return (
      <span className="text-[var(--zd-text-primary)] truncate max-w-xs block font-mono text-xs" title={String(value)}>
        {String(value)}
      </span>
    );
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--zd-text-secondary)] p-8 text-center bg-[var(--zd-surface)] border border-[var(--zd-border)]">
        <TableIcon className="w-12 h-12 mb-4 text-[var(--zd-text-muted)]" />
        <p className="text-sm font-medium">{error}</p>
        <p className="text-xs mt-2 max-w-md">Ensure your JSON matches the expected structure.</p>
        {selectedPath !== '[]' && (
          <button
            type="button"
            onClick={() => {
              setSelectedPath('[]');
              setSortCol(null);
              setSortDesc(false);
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            Reset to Root
          </button>
        )}
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--zd-surface)]">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/40 shrink-0">
          <div className="flex items-center gap-1.5">
            {currentPathParts.length > 0 && (
              <button
                type="button"
                onClick={stepOut}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Step Out</span>
              </button>
            )}
            <span className="text-xs font-mono text-[var(--zd-text-muted)]">
              {currentDotPath ? `Root > ${currentDotPath}` : 'Root'}
            </span>
          </div>
          {onToggleLayout && (
            <button
              type="button"
              onClick={onToggleLayout}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-xs text-[var(--zd-text-secondary)]"
            >
              {panelLayout === 'full' ? <Columns2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{panelLayout === 'full' ? 'Split View' : 'Full Mode'}</span>
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] text-sm">
          Empty data
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--zd-surface)] overflow-hidden min-h-0">
      {/* Navigation, Breadcrumbs & Action Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/40 shrink-0 flex-wrap min-h-[42px]">
        {/* Left: Step Out button & Breadcrumbs */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {currentPathParts.length > 0 && (
            <button
              type="button"
              onClick={stepOut}
              title="Step out to parent object (Go back)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors shrink-0 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Step Out</span>
            </button>
          )}

          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => jumpToBreadcrumb(-1)}
              className={cn(
                'px-1.5 py-0.5 rounded hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] transition-colors font-medium',
                currentPathParts.length === 0
                  ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] font-semibold'
                  : 'text-[var(--zd-text-secondary)]'
              )}
            >
              Root
            </button>
            {currentPathParts.map((part, idx) => {
              const isLast = idx === currentPathParts.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="w-3 h-3 text-[var(--zd-text-muted)]" />
                  <button
                    type="button"
                    onClick={() => jumpToBreadcrumb(idx)}
                    className={cn(
                      'px-1.5 py-0.5 rounded transition-colors truncate max-w-[160px]',
                      isLast
                        ? 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] font-semibold'
                        : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)]'
                    )}
                    title={part}
                  >
                    {part}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Path Selector Dropdown, Copy Path, Layout Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pathOptions.length > 1 && (
            <div className="hidden lg:flex items-center gap-1">
              <span className="text-[10px] font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                Select Path:
              </span>
              <select
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                className="text-xs font-medium bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-md px-2 py-1 outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)] max-w-xs truncate"
              >
                {pathOptions.map((opt) => (
                  <option key={opt.path} value={opt.path}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              handleCopy(
                currentDotPath || 'root',
                'selected-path',
                `Copied path "${currentDotPath || 'root'}"`
              )
            }
            title={currentDotPath ? `Copy path: ${currentDotPath}` : 'Copy root path'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors shrink-0 shadow-xs',
              copiedId === 'selected-path'
                ? 'border-[var(--zd-accent)] bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]'
                : 'border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)]'
            )}
          >
            {copiedId === 'selected-path' ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Path</span>
              </>
            )}
          </button>

          {onToggleLayout && (
            <button
              type="button"
              onClick={onToggleLayout}
              title={
                panelLayout === 'full'
                  ? 'Switch to Split View (show Editor alongside)'
                  : 'Switch to Full Mode (hide Editor)'
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-xs font-medium text-[var(--zd-text-secondary)] transition-colors shadow-xs"
            >
              {panelLayout === 'full' ? (
                <>
                  <Columns2 className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
                  <span className="hidden sm:inline">Split View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
                  <span className="hidden sm:inline">Full Mode</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table grid wrapper */}
      <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-[var(--zd-text-muted)] uppercase bg-[var(--zd-surface-raised)] sticky top-0 z-10 border-b border-[var(--zd-border)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold border-r border-[var(--zd-border)] w-16 text-center text-[var(--zd-text-muted)] select-none">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 font-semibold border-r border-[var(--zd-border)] hover:bg-[var(--zd-primary-soft)]/40 transition-colors group/th whitespace-nowrap select-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        onClick={() => handleSort(col)}
                        className="cursor-pointer hover:text-[var(--zd-primary)] transition-colors truncate"
                      >
                        {col}
                      </span>
                      {col === 'key' && sortedData && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const allKeys = sortedData.map((r) => r.key).join('\n');
                            handleCopy(allKeys, 'all-keys', `Copied all ${sortedData.length} keys`);
                          }}
                          title="Copy all keys (newline-separated)"
                          className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-normal transition-colors border',
                            copiedId === 'all-keys'
                              ? 'border-[var(--zd-accent)] text-[var(--zd-accent)] bg-[var(--zd-accent-soft)]'
                              : 'border-transparent text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-border)]'
                          )}
                        >
                          {copiedId === 'all-keys' ? (
                            <Check className="w-3 h-3 text-[var(--zd-accent)]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span className="normal-case">
                            {copiedId === 'all-keys' ? 'Copied All' : 'Copy All'}
                          </span>
                        </button>
                      )}
                      {col !== 'key' && col !== 'value' && col !== 'index' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(col, `col-${col}`, `Copied column key "${col}"`);
                          }}
                          title={`Copy column key "${col}"`}
                          className="opacity-0 group-hover/th:opacity-100 p-0.5 rounded hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)] transition-opacity"
                        >
                          {copiedId === `col-${col}` ? (
                            <Check className="w-3 h-3 text-[var(--zd-accent)]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div
                      onClick={() => handleSort(col)}
                      className="cursor-pointer flex flex-col opacity-50 group-hover/th:opacity-100 transition-opacity"
                    >
                      {sortCol === col ? (
                        sortDesc ? (
                          <ChevronDown className="w-3 h-3 text-[var(--zd-primary)] opacity-100" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-[var(--zd-primary)] opacity-100" />
                        )
                      ) : (
                        <ChevronUp className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData!.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--zd-border)]/50 hover:bg-[var(--zd-primary-soft)]/20 transition-colors"
              >
                <td className="px-4 py-2 border-r border-[var(--zd-border)]/50 text-center text-[var(--zd-text-muted)] font-mono text-xs">
                  {i + 1}
                </td>
                {columns.map((col) => {
                  if (col === 'key') {
                    const fullPath = currentDotPath ? `${currentDotPath}.${row.key}` : row.key;
                    const isNested = typeof row.value === 'object' && row.value !== null;

                    return (
                      <td key={col} className="px-4 py-2 border-r border-[var(--zd-border)]/50 group/keycell">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span
                            onClick={() => isNested && stepInto(row.key)}
                            className={cn(
                              'font-mono text-xs font-semibold select-text truncate',
                              isNested
                                ? 'text-[var(--zd-primary)] cursor-pointer hover:underline'
                                : 'text-[var(--zd-text-primary)]'
                            )}
                            title={isNested ? `Click to step into ${row.key}` : row.key}
                          >
                            {row.key}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/keycell:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(row.key, `key-${i}`, `Copied key "${row.key}"`)}
                              title={`Copy key: ${row.key}`}
                              className={cn(
                                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors',
                                copiedId === `key-${i}`
                                  ? 'border-[var(--zd-accent)] bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]'
                                  : 'border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-primary)]'
                              )}
                            >
                              {copiedId === `key-${i}` ? (
                                <Check className="w-3 h-3 text-[var(--zd-accent)]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedId === `key-${i}` ? 'Copied' : 'Copy'}</span>
                            </button>
                            {currentDotPath && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(fullPath, `path-${i}`, `Copied full path: ${fullPath}`)
                                }
                                title={`Copy full path: ${fullPath}`}
                                className={cn(
                                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors',
                                  copiedId === `path-${i}`
                                    ? 'border-[var(--zd-accent)] bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]'
                                    : 'border-[var(--zd-border)] bg-[var(--zd-surface)] text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-primary)]'
                                )}
                              >
                                {copiedId === `path-${i}` ? (
                                  <Check className="w-2.5 h-2.5 text-[var(--zd-accent)]" />
                                ) : null}
                                <span>{copiedId === `path-${i}` ? 'Copied' : 'Full Path'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  const drillInKey = col === 'value' ? row.key : col;

                  return (
                    <td key={col} className="px-4 py-2 border-r border-[var(--zd-border)]/50 group/valcell">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0 truncate">{renderCell(row[col], drillInKey)}</div>
                        <button
                          type="button"
                          onClick={() => {
                            const raw =
                              typeof row[col] === 'object' && row[col] !== null
                                ? JSON.stringify(row[col], null, 2)
                                : String(row[col] ?? '');
                            handleCopy(raw, `val-${i}-${col}`, 'Copied value');
                          }}
                          title="Copy value"
                          className="p-1 rounded opacity-0 group-hover/valcell:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)] transition-all shrink-0"
                        >
                          {copiedId === `val-${i}-${col}` ? (
                            <Check className="w-3 h-3 text-[var(--zd-accent)]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
