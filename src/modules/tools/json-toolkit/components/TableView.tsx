import { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Table as TableIcon } from 'lucide-react';

interface TableViewProps {
  jsonString: string;
}

interface PathOption {
  label: string;
  path: string;
  value: any;
}

// Recursively traverse JSON to collect paths of nested arrays and objects
function getPathOptions(value: any, path: string[] = [], depth = 0, options: PathOption[] = []): PathOption[] {
  if (value === null || typeof value !== 'object' || depth > 5) return options;

  const pathLabel = path.length ? path.join('.') : 'Root';

  if (Array.isArray(value)) {
    options.push({
      label: path.length ? `${pathLabel} (Array)` : 'Root Array',
      path: JSON.stringify(path),
      value
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
    value
  });

  // Recurse into object properties
  Object.entries(value).forEach(([key, val]) => {
    if (val && typeof val === 'object') {
      getPathOptions(val, [...path, key], depth + 1, options);
    }
  });

  return options;
}

export function TableView({ jsonString }: TableViewProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('[]');

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

  useEffect(() => {
    if (pathOptions.length > 0 && !pathOptions.some(o => o.path === selectedPath)) {
      setSelectedPath(pathOptions[0].path);
      setSortCol(null);
      setSortDesc(false);
    }
  }, [pathOptions, selectedPath]);

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
        viewType: 'primitive'
      };
    }

    if (Array.isArray(selectedNode)) {
      if (selectedNode.length === 0) {
        return { data: [], columns: [], error: null, viewType: 'empty_array' };
      }

      const isArrayOfObjects = selectedNode.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
      if (!isArrayOfObjects) {
        const rows = selectedNode.map((val, idx) => ({
          index: idx + 1,
          value: val
        }));
        return { data: rows, columns: ['index', 'value'], error: null, viewType: 'flat_array' };
      }

      const keySet = new Set<string>();
      selectedNode.forEach(obj => {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(k => keySet.add(k));
        }
      });
      return { data: selectedNode, columns: Array.from(keySet), error: null, viewType: 'array_of_objects' };
    }

    // Single object -> key-value rows
    const rows = Object.entries(selectedNode).map(([key, val]) => ({
      key,
      value: val
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

  const renderCell = (value: any) => {
    if (value === null) return <span className="text-[var(--zd-text-muted)] italic">null</span>;
    if (value === undefined) return <span className="text-[var(--zd-text-muted)]"></span>;
    if (typeof value === 'boolean') return <span className="text-[var(--zd-accent)] font-mono">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-[var(--zd-primary)] font-mono">{value}</span>;
    if (typeof value === 'object') {
      const isArray = Array.isArray(value);
      const label = isArray ? `[Array(${value.length})]` : `{Object}`;
      return <span className="text-[var(--zd-primary)] font-mono text-xs bg-[var(--zd-primary-soft)] px-1.5 py-0.5 rounded">{label}</span>;
    }
    return <span className="text-[var(--zd-text-primary)] truncate max-w-xs block" title={String(value)}>{String(value)}</span>;
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--zd-text-secondary)] p-8 text-center bg-[var(--zd-surface)] border border-[var(--zd-border)]">
        <TableIcon className="w-12 h-12 mb-4 text-[var(--zd-text-muted)]" />
        <p className="text-sm font-medium">{error}</p>
        <p className="text-xs mt-2 max-w-md">Ensure your JSON matches the expected structure.</p>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--zd-surface)]">
        {pathOptions.length > 1 && (
          <div className="flex items-center gap-2 p-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Select Path:</span>
            <select 
              value={selectedPath} 
              onChange={(e) => setSelectedPath(e.target.value)}
              className="text-xs font-medium bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2.5 py-1 outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
            >
              {pathOptions.map(opt => (
                <option key={opt.path} value={opt.path}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center text-[var(--zd-text-muted)] text-sm">
          Empty data
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--zd-surface)] overflow-hidden min-h-0">
      {/* Path Selector Toolbar */}
      {pathOptions.length > 1 && (
        <div className="flex items-center gap-2 p-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 shrink-0">
          <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Select Path:</span>
          <select 
            value={selectedPath} 
            onChange={(e) => setSelectedPath(e.target.value)}
            className="text-xs font-medium bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded px-2.5 py-1 outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary-soft)] text-[var(--zd-text-primary)]"
          >
            {pathOptions.map(opt => (
              <option key={opt.path} value={opt.path}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table grid wrapper */}
      <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-[var(--zd-text-muted)] uppercase bg-[var(--zd-surface-raised)] sticky top-0 z-10 border-b border-[var(--zd-border)]">
            <tr>
              <th className="px-4 py-3 font-semibold border-r border-[var(--zd-border)] w-16 text-center text-[var(--zd-text-muted)]">#</th>
              {columns.map(col => (
                <th 
                  key={col} 
                  className="px-4 py-3 font-semibold border-r border-[var(--zd-border)] cursor-pointer hover:bg-[var(--zd-primary-soft)]/50 transition-colors group whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{col}</span>
                    <div className="flex flex-col opacity-0 group-hover:opacity-50 transition-opacity">
                      {sortCol === col ? (
                        sortDesc ? <ChevronDown className="w-3 h-3 text-[var(--zd-primary)] opacity-100" /> : <ChevronUp className="w-3 h-3 text-[var(--zd-primary)] opacity-100" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData!.map((row, i) => (
              <tr key={i} className="border-b border-[var(--zd-border)]/50 hover:bg-[var(--zd-primary-soft)]/20 transition-colors">
                <td className="px-4 py-2 border-r border-[var(--zd-border)]/50 text-center text-[var(--zd-text-muted)] font-mono text-xs">{i + 1}</td>
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 border-r border-[var(--zd-border)]/50">
                    {renderCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
