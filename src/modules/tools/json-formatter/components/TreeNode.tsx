import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TreeNodeProps {
  name: string | null;
  value: any;
  isLast: boolean;
  depth?: number;
  initiallyExpanded?: boolean;
}

export function TreeNode({ name, value, isLast, depth = 0, initiallyExpanded = true }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isComplex = isObject || isArray;
  
  const toggle = () => setIsExpanded(!isExpanded);

  const getValueColor = (val: any) => {
    if (val === null) return 'text-slate-400 dark:text-slate-500';
    switch (typeof val) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-slate-800 dark:text-slate-200';
    }
  };

  const formatValue = (val: any) => {
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
  };

  // Render complex type (Object/Array)
  if (isComplex) {
    const keys = Object.keys(value);
    const isEmpty = keys.length === 0;
    const bracketOpen = isArray ? '[' : '{';
    const bracketClose = isArray ? ']' : '}';
    const typeLabel = isArray ? `Array(${keys.length})` : `Object{${keys.length}}`;

    return (
      <div className="font-mono text-sm leading-relaxed" style={{ marginLeft: depth > 0 ? '1.5rem' : '0' }}>
        <div 
          className={`flex items-center gap-1 group ${isEmpty ? '' : 'cursor-pointer'} hover:bg-[var(--zd-primary-soft)]/50 -ml-1 pl-1 rounded py-0.5 transition-colors duration-150`}
          onClick={isEmpty ? undefined : toggle}
        >
          {!isEmpty ? (
            <button className="text-slate-400 hover:text-[var(--zd-primary)] transition-colors">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5" /> // spacer
          )}
          
          {name !== null && (
            <span className="text-[var(--zd-primary)] font-medium">"{name}"</span>
          )}
          {name !== null && <span className="text-slate-500">:</span>}
          
          <span className="text-slate-500">{bracketOpen}</span>
          
          {!isExpanded && !isEmpty && (
            <>
              <span className="text-xs text-slate-400 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] px-1.5 py-0.5 rounded-md mx-1">{typeLabel}</span>
              <span className="text-slate-500">{bracketClose}</span>
              {!isLast && <span className="text-slate-500">,</span>}
            </>
          )}
          {isEmpty && (
            <>
              <span className="text-slate-500">{bracketClose}</span>
              {!isLast && <span className="text-slate-500">,</span>}
            </>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && !isEmpty && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="border-l border-[var(--zd-border)] ml-1.5 pl-0.5">
                {keys.map((k, i) => (
                  <TreeNode 
                    key={k} 
                    name={isArray ? null : k} 
                    value={value[k as keyof typeof value]} 
                    isLast={i === keys.length - 1}
                    depth={depth + 1} 
                    initiallyExpanded={initiallyExpanded && depth < 2}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isExpanded && !isEmpty && (
          <div className="flex items-center group -ml-1 pl-1 rounded py-0.5" style={{ paddingLeft: '1.25rem' }}>
            <span className="text-slate-500">{bracketClose}</span>
            {!isLast && <span className="text-slate-500">,</span>}
          </div>
        )}
      </div>
    );
  }

  // Render Primitive
  return (
    <div className="font-mono text-sm leading-relaxed flex items-start py-0.5 hover:bg-[var(--zd-primary-soft)]/50 -ml-1 pl-1 rounded transition-colors duration-150" style={{ marginLeft: depth > 0 ? '1.5rem' : '0' }}>
      <span className="w-3.5 shrink-0" /> {/* Match chevron spacing */}
      
      {name !== null && (
        <span className="text-[var(--zd-primary)] font-medium shrink-0">"{name}"</span>
      )}
      {name !== null && <span className="text-slate-500 mx-1 shrink-0">:</span>}
      
      <span className={`${getValueColor(value)} break-all`}>
        {formatValue(value)}
      </span>
      {!isLast && <span className="text-slate-500 shrink-0">,</span>}
    </div>
  );
}
