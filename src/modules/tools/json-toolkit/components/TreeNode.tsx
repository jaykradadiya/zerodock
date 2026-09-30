import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TreeNodeProps {
  name: string | null;
  value: unknown;
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

  const getValueColor = (val: unknown) => {
    if (val === null) return 'text-[var(--zd-text-muted)]';
    switch (typeof val) {
      case 'string': return 'text-[var(--zd-text-primary)] font-medium';
      case 'number': return 'text-[var(--zd-primary)]';
      case 'boolean': return 'text-[var(--zd-accent)]';
      default: return 'text-[var(--zd-text-primary)]';
    }
  };

  const formatValue = (val: unknown) => {
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
  };

  // Render complex type (Object/Array)
  if (isComplex) {
    const keys = Object.keys(value as object);
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
            <button className="text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] transition-colors">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5" /> // spacer
          )}
          
          {name !== null && (
            <span className="text-[var(--zd-primary)] font-medium">"{name}"</span>
          )}
          {name !== null && <span className="text-[var(--zd-text-muted)]">:</span>}
          
          <span className="text-[var(--zd-text-muted)]">{bracketOpen}</span>
          
          {!isExpanded && !isEmpty && (
            <>
              <span className="text-xs text-[var(--zd-text-muted)] bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] px-1.5 py-0.5 rounded-md mx-1">{typeLabel}</span>
              <span className="text-[var(--zd-text-muted)]">{bracketClose}</span>
              {!isLast && <span className="text-[var(--zd-text-muted)]">,</span>}
            </>
          )}
          {isEmpty && (
            <>
              <span className="text-[var(--zd-text-muted)]">{bracketClose}</span>
              {!isLast && <span className="text-[var(--zd-text-muted)]">,</span>}
            </>
          )}
        </div>

        {isExpanded && !isEmpty && (
          keys.length > 30 ? (
            <div className="border-l border-[var(--zd-border)] ml-1.5 pl-0.5">
              {keys.map((k, i) => (
                <TreeNode 
                  key={k} 
                  name={isArray ? null : k} 
                  value={(value as Record<string, unknown>)[k]} 
                  isLast={i === keys.length - 1}
                  depth={depth + 1} 
                  initiallyExpanded={initiallyExpanded && depth < 2}
                />
              ))}
            </div>
          ) : (
            <AnimatePresence initial={false}>
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
                      value={(value as Record<string, unknown>)[k]} 
                      isLast={i === keys.length - 1}
                      depth={depth + 1} 
                      initiallyExpanded={initiallyExpanded && depth < 2}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )
        )}

        {isExpanded && !isEmpty && (
          <div className="flex items-center group -ml-1 pl-1 rounded py-0.5" style={{ paddingLeft: '1.25rem' }}>
            <span className="text-[var(--zd-text-muted)]">{bracketClose}</span>
            {!isLast && <span className="text-[var(--zd-text-muted)]">,</span>}
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
      {name !== null && <span className="text-[var(--zd-text-muted)] mx-1 shrink-0">:</span>}
      
      <span className={`${getValueColor(value)} break-all`}>
        {formatValue(value)}
      </span>
      {!isLast && <span className="text-[var(--zd-text-muted)] shrink-0">,</span>}
    </div>
  );
}
