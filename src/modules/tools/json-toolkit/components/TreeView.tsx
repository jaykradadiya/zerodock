import { useState, useMemo } from 'react';
import { TreeNode } from './TreeNode';

interface TreeViewProps {
  jsonString: string;
  tabId?: string;
}

export function TreeView({ jsonString, tabId }: TreeViewProps) {
  const [expandAllKey, setExpandAllKey] = useState(0); // changing this forces re-mount of tree with new initial state

  const parsedData = useMemo(() => {
    if (typeof jsonString !== 'string' || !jsonString.trim()) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }, [jsonString]);

  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        No JSON to display
      </div>
    );
  }

  if (parsedData === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Invalid JSON format
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--zd-surface)] overflow-hidden min-h-0">
      {/* Tree Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/30 shrink-0">
        <div className="flex items-center gap-2">
          {/* We can add search here in the future */}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setExpandAllKey(k => k + 1)}
            className="text-xs font-medium text-slate-500 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] bg-[var(--zd-surface)] border border-[var(--zd-border)] px-2 py-1 rounded shadow-sm transition-colors"
          >
            Reset view
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar min-h-0">
        <div key={`${expandAllKey}-${tabId || ''}`} className="min-w-fit">
          <TreeNode 
            name={null} 
            value={parsedData} 
            isLast={true} 
            depth={0} 
            initiallyExpanded={true} 
          />
        </div>
      </div>
    </div>
  );
}
