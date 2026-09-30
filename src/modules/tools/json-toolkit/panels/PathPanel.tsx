import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Filter,
  X,
  Sparkles,
  Columns2,
  Maximize2,
  PlusSquare,
  AlertCircle,
  BookOpen,
  Code2,
  Compass,
  Search,
  Layers,
  ChevronDown,
  Check,
  Calculator,
  ArrowUpDown,
  Tag,
  SlidersHorizontal,
  Clock,
  Copy,
  Zap,
  RotateCcw,
  Terminal,
  CornerDownLeft,
} from 'lucide-react';
import { CodePanel } from '../../../../shared/components/CodePanel';
import { SidePanelShell } from './SidePanelShell';
import type { ToolkitPanelProps } from './types';
import {
  evaluateQuery,
  FILTER_TYPES,
  type FilterType,
  PRESET_SNIPPETS,
  PRESET_CATEGORIES,
  type PresetCategory,
  generateSmartSuggestions,
  generateQuickFilterChips,
  type QuickFilterChip,
} from '../lib/queryEngine';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useToastStore } from '../../../../core/store/useToastStore';
import { cn } from '../../../../shared/components/ui';

export interface PathPanelProps extends ToolkitPanelProps {
  panelLayout?: 'full' | 'split';
  onToggleLayout?: () => void;
}

function getDialectIcon(type: FilterType, className = 'w-3.5 h-3.5 shrink-0') {
  switch (type) {
    case 'javascript':
      return <Code2 className={cn('text-amber-400', className)} />;
    case 'jmespath':
      return <Compass className={cn('text-purple-400', className)} />;
    case 'jsonpath':
      return <Search className={cn('text-blue-400', className)} />;
    case 'dotpath':
      return <Layers className={cn('text-emerald-400', className)} />;
  }
}

function getChipIcon(iconType: QuickFilterChip['iconType']) {
  switch (iconType) {
    case 'filter':
      return <Filter className="w-3 h-3 text-sky-400 shrink-0" />;
    case 'sum':
      return <Calculator className="w-3 h-3 text-emerald-400 shrink-0" />;
    case 'sort':
      return <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />;
    case 'pluck':
      return <Tag className="w-3 h-3 text-violet-400 shrink-0" />;
    case 'keys':
      return <Code2 className="w-3 h-3 text-rose-400 shrink-0" />;
    case 'count':
      return <SlidersHorizontal className="w-3 h-3 text-cyan-400 shrink-0" />;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PathPanel({
  sourceJson,
  onClose,
  panelLayout = 'split',
  onToggleLayout,
}: PathPanelProps) {
  const [filterType, setFilterType] = useState<FilterType>('javascript');
  const [query, setQuery] = useState('return data;');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [evalDurationMs, setEvalDurationMs] = useState<number | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    type: string;
    count?: number;
    sizeBytes?: number;
  } | null>(null);

  // Popover & Modal state
  const [dialectMenuOpen, setDialectMenuOpen] = useState(false);
  const [showRecipesModal, setShowRecipesModal] = useState(false);
  const [modalDialect, setModalDialect] = useState<FilterType>(filterType);
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'all'>('all');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [copiedRecipeLabel, setCopiedRecipeLabel] = useState<string | null>(null);

  const dialectMenuRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedItemRef = useRef<HTMLButtonElement | null>(null);

  const { addTab, setActiveTab } = useWorkspaceStore();

  const activeOption = useMemo(
    () => FILTER_TYPES.find((f) => f.id === filterType) || FILTER_TYPES[0],
    [filterType]
  );

  // Parse sourceJson once for structural introspection
  const parsedData = useMemo(() => {
    if (!sourceJson.trim()) return null;
    try {
      return JSON.parse(sourceJson);
    } catch {
      return null;
    }
  }, [sourceJson]);

  // Root properties available in the loaded document
  const availableKeys = useMemo(() => {
    if (!parsedData || typeof parsedData !== 'object') return [];
    if (Array.isArray(parsedData)) {
      if (parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null) {
        return Object.keys(parsedData[0]);
      }
      return [];
    }
    return Object.keys(parsedData);
  }, [parsedData]);

  // Dynamic genuine path suggestions (Document Fields only)
  const suggestions = useMemo(() => {
    return generateSmartSuggestions(parsedData, filterType);
  }, [parsedData, filterType]);

  // Dynamic quick action filter chips (Sum, Filter, Pluck, Sort, Keys, Length)
  const quickFilterChips = useMemo(() => {
    return generateQuickFilterChips(parsedData, filterType);
  }, [parsedData, filterType]);

  // Recipe presets for the active modal dialect
  const modalPresets = useMemo(() => {
    return PRESET_SNIPPETS[modalDialect] || [];
  }, [modalDialect]);

  const filteredPresets = useMemo(() => {
    return modalPresets.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        !presetSearch.trim() ||
        p.label.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.query.toLowerCase().includes(presetSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [modalPresets, selectedCategory, presetSearch]);

  const selectedPreset = useMemo(() => {
    if (filteredPresets.length === 0) return null;
    return filteredPresets[Math.min(selectedPresetIndex, filteredPresets.length - 1)] || filteredPresets[0];
  }, [filteredPresets, selectedPresetIndex]);

  // Live evaluation of selected recipe against currently loaded user document
  const livePreview = useMemo(() => {
    if (!parsedData || !selectedPreset) return null;
    try {
      const res = evaluateQuery(parsedData, selectedPreset.query, modalDialect);
      if (res.success && res.result !== undefined) {
        return JSON.stringify(res.result, null, 2);
      }
    } catch {
      // fallback
    }
    return null;
  }, [parsedData, selectedPreset, modalDialect]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedPresetIndex]);

  // Total recipes for current dialect
  const currentDialectRecipeCount = useMemo(() => {
    return (PRESET_SNIPPETS[filterType] || []).length;
  }, [filterType]);

  // Close dialect menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialectMenuRef.current && !dialectMenuRef.current.contains(e.target as Node)) {
        setDialectMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleApplyRecipe = useCallback((recipeQuery: string, dialect: FilterType) => {
    if (dialect !== filterType) {
      setFilterType(dialect);
    }
    setQuery(recipeQuery);
    setShowRecipesModal(false);
    useToastStore.getState().addToast('Recipe loaded into query editor', 'info');
  }, [filterType]);

  // Keyboard navigation for recipes modal
  useEffect(() => {
    if (!showRecipesModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowRecipesModal(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPresetIndex((prev) => Math.min(prev + 1, filteredPresets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPresetIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedPreset) {
          e.preventDefault();
          handleApplyRecipe(selectedPreset.query, modalDialect);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRecipesModal, filteredPresets, selectedPreset, modalDialect, handleApplyRecipe]);

  // Auto-expand textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lines = query.split('\n').length;
      if (lines > 1) {
        textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 40), 220)}px`;
      } else {
        textareaRef.current.style.height = '36px';
      }
    }
  }, [query]);

  const handleFilterTypeChange = (newType: FilterType) => {
    setFilterType(newType);
    setDialectMenuOpen(false);
    const opt = FILTER_TYPES.find((f) => f.id === newType);
    if (opt) setQuery(opt.defaultQuery);
  };

  // Execution engine
  const runEvaluationNow = useCallback(() => {
    if (!sourceJson.trim() || !query.trim()) {
      setOutput('');
      setError(null);
      setEvalDurationMs(null);
      setResultMeta(null);
      return;
    }

    const start = performance.now();
    try {
      const parsedJson = JSON.parse(sourceJson);
      const res = evaluateQuery(parsedJson, query, filterType);
      const duration = Math.max(0.1, Number((performance.now() - start).toFixed(1)));
      setEvalDurationMs(duration);

      if (!res.success) {
        setError(res.error || 'Evaluation failed');
        setOutput('');
        setResultMeta(null);
      } else if (res.result === undefined) {
        setOutput('undefined (no match)');
        setError(null);
        setResultMeta({ type: 'undefined', count: 0, sizeBytes: 9 });
      } else {
        const formatted = JSON.stringify(res.result, null, 2);
        setOutput(formatted);
        setError(null);

        let typeStr: string = typeof res.result;
        let count: number | undefined = undefined;
        if (res.result === null) {
          typeStr = 'null';
        } else if (Array.isArray(res.result)) {
          typeStr = 'array';
          count = res.result.length;
        } else if (typeof res.result === 'object') {
          typeStr = 'object';
          count = Object.keys(res.result).length;
        }

        setResultMeta({
          type: typeStr,
          count,
          sizeBytes: new Blob([formatted]).size,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid JSON input';
      setError(message);
      setOutput('');
      setResultMeta(null);
      setEvalDurationMs(null);
    }
  }, [sourceJson, query, filterType]);

  // Support Tab key indentation and Cmd+Enter immediate evaluation
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setQuery(newVal);
      setTimeout(() => {
        if (target) {
          target.selectionStart = target.selectionEnd = start + 2;
        }
      }, 0);
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runEvaluationNow();
    }
  };

  // Debounced evaluation on query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      runEvaluationNow();
    }, 120);

    return () => clearTimeout(timer);
  }, [runEvaluationNow]);

  const handleOpenAsTab = useCallback(async () => {
    if (!output || output === 'null' || output === 'undefined (no match)') return;
    try {
      const newTabId = await addTab('query_result.json', output);
      setActiveTab(newTabId);
      useToastStore.getState().addToast('Query result loaded into new tab', 'success');
    } catch (err) {
      console.error('Failed to open as tab', err);
    }
  }, [output, addTab, setActiveTab]);

  const handleCopyRecipeCode = (recipeQuery: string, label: string) => {
    navigator.clipboard.writeText(recipeQuery);
    setCopiedRecipeLabel(label);
    useToastStore.getState().addToast('Recipe copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedRecipeLabel(null);
    }, 2000);
  };

  const handleResetQuery = () => {
    setQuery(activeOption.defaultQuery);
    useToastStore.getState().addToast(`Reset to default ${activeOption.label} query`, 'info');
  };

  const isNullOrEmptyMatch =
    !error &&
    query.trim() !== '' &&
    query.trim() !== '@' &&
    query.trim() !== '$' &&
    query.trim() !== '*' &&
    query.trim() !== 'return data;' &&
    (output === 'null' || output === 'undefined (no match)');

  // Header Toolbar with Split/Full view and New Tab action
  const headerToolbar = (
    <div className="flex items-center gap-1.5 ml-auto">
      {onToggleLayout && (
        <button
          type="button"
          onClick={onToggleLayout}
          title={
            panelLayout === 'full'
              ? 'Switch to Split View (show editor alongside)'
              : 'Switch to Full Mode (hide editor)'
          }
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors shadow-xs"
        >
          {panelLayout === 'full' ? (
            <>
              <Columns2 className="w-3 h-3 text-[var(--zd-primary)]" />
              <span className="hidden sm:inline">Split</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3 h-3 text-[var(--zd-primary)]" />
              <span className="hidden sm:inline">Full</span>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={handleOpenAsTab}
        disabled={!output || output === 'null' || output === 'undefined (no match)'}
        title="Open filtered output into a new workspace tab"
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <PlusSquare className="w-3 h-3 text-[var(--zd-primary)]" />
        <span className="hidden sm:inline">New Tab</span>
      </button>
    </div>
  );

  return (
    <SidePanelShell
      title="Path Query"
      onClose={onClose ?? (() => {})}
      badge={
        <div className="flex items-center gap-1.5">
          {/* Dialect Selector Dropdown */}
          <div className="relative" ref={dialectMenuRef}>
            <button
              type="button"
              onClick={() => setDialectMenuOpen(!dialectMenuOpen)}
              title="Switch query dialect"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shadow-xs cursor-pointer select-none',
                dialectMenuOpen
                  ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)] text-[var(--zd-primary)] ring-2 ring-[var(--zd-primary)]/20'
                  : 'bg-[var(--zd-surface)] border-[var(--zd-border)] hover:border-[var(--zd-primary)]/40 hover:bg-[var(--zd-primary-soft)] text-[var(--zd-text-primary)]'
              )}
            >
              {getDialectIcon(filterType)}
              <span>{activeOption.label}</span>
              <ChevronDown
                className={cn(
                  'w-3 h-3 text-[var(--zd-text-muted)] transition-transform duration-200',
                  dialectMenuOpen && 'rotate-180 text-[var(--zd-primary)]'
                )}
              />
            </button>

            {/* Glassmorphic Dialect Popover */}
            {dialectMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--zd-text-muted)] border-b border-[var(--zd-border)] mb-0.5 flex items-center justify-between">
                  <span>Select Query Language</span>
                  <Sparkles className="w-3 h-3 text-[var(--zd-primary)]" />
                </div>
                {FILTER_TYPES.map((option) => {
                  const isSelected = option.id === filterType;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleFilterTypeChange(option.id)}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-start gap-2.5 group cursor-pointer border',
                        isSelected
                          ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/30 text-[var(--zd-primary)] shadow-xs'
                          : 'border-transparent hover:bg-[var(--zd-surface)] hover:border-[var(--zd-border)] text-[var(--zd-text-primary)]'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">{getDialectIcon(option.id)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--zd-primary)] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[var(--zd-text-muted)] group-hover:text-[var(--zd-text-secondary)] line-clamp-2 leading-tight mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recipes Library Button (Header integrated) */}
          <button
            type="button"
            onClick={() => {
              setModalDialect(filterType);
              setSelectedCategory('all');
              setPresetSearch('');
              setSelectedPresetIndex(0);
              setShowRecipesModal(true);
            }}
            title="Open comprehensive recipe & filter patterns library"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:border-[var(--zd-primary)]/50 text-[var(--zd-text-primary)] hover:text-[var(--zd-primary)] transition-all shadow-xs cursor-pointer select-none"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
            <span>Recipes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/20">
              {currentDialectRecipeCount}
            </span>
          </button>
        </div>
      }
      toolbar={headerToolbar}
    >
      <div className="flex flex-col flex-1 min-h-0 h-full">
        {/* Full-width Query Editor Container */}
        <div className="p-3 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex flex-col gap-2 shrink-0">
          <div className="w-full flex flex-col bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-xl focus-within:border-[var(--zd-primary)] focus-within:ring-1 focus-within:ring-[var(--zd-primary)]/25 shadow-xs transition-all overflow-hidden">
            {/* Editor Top Control Bar */}
            <div className="px-3 py-1.5 bg-[var(--zd-surface)]/70 border-b border-[var(--zd-border)]/60 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-[var(--zd-text-secondary)]">
                {getDialectIcon(filterType, 'w-3 h-3')}
                <span className="font-mono">{activeOption.label} Expression</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetQuery}
                  title="Reset to default expression"
                  className="p-1 rounded text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    title="Clear editor (✕)"
                    className="p-1 rounded text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Multiline Textarea */}
            <div className="flex items-start gap-2 p-2.5">
              <span className="font-mono text-xs text-[var(--zd-primary)] select-none mt-1 opacity-70">
                &gt;
              </span>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={activeOption.placeholder}
                rows={Math.min(Math.max(query.split('\n').length, 1), 6)}
                className="w-full bg-transparent text-xs font-mono outline-none text-[var(--zd-text-primary)] placeholder:text-[var(--zd-text-muted)] resize-y min-h-[36px] max-h-[220px] leading-relaxed scrollbar-thin"
              />
            </div>
          </div>

          {/* Unified Single-Row Chips Ribbon: Quick Actions + Real Document Fields */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {/* Quick Actions Group */}
            {quickFilterChips.length > 0 && (
              <>
                <span className="text-[10px] uppercase font-bold text-[var(--zd-primary)] tracking-wider shrink-0 select-none mr-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Actions:</span>
                </span>
                {quickFilterChips.map((chip, idx) => (
                  <button
                    key={`action-${idx}`}
                    type="button"
                    onClick={() => setQuery(chip.query)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)]/50 hover:bg-[var(--zd-primary-soft)] text-[var(--zd-text-primary)] hover:text-[var(--zd-primary)] transition-all cursor-pointer shadow-2xs"
                    title={`Run: ${chip.query}`}
                  >
                    {getChipIcon(chip.iconType)}
                    <span>{chip.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Separator between Actions and Fields */}
            {quickFilterChips.length > 0 && suggestions.length > 0 && (
              <div className="h-3.5 w-px bg-[var(--zd-border)] mx-1 shrink-0" />
            )}

            {/* Genuine Document Fields Group (Duplicates removed) */}
            {suggestions.length > 0 && (
              <>
                <span className="text-[10px] uppercase font-bold text-[var(--zd-text-muted)] tracking-wider shrink-0 select-none mr-0.5">
                  Fields:
                </span>
                {suggestions.map((s) => (
                  <button
                    key={`field-${s.query}`}
                    type="button"
                    onClick={() => setQuery(s.query)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[11px] font-mono shrink-0 border transition-all cursor-pointer',
                      query === s.query
                        ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/50 text-[var(--zd-primary)] font-semibold shadow-xs'
                        : 'bg-[var(--zd-surface)] border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-primary)]/40'
                    )}
                    title={`Run query: ${s.query}`}
                  >
                    {s.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Execution Status Bar (Count, Type, Latency, Live indicator) */}
        <div className="px-3.5 py-1.5 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex items-center justify-between text-xs select-none shrink-0">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            {error ? (
              <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px] truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Valid</span>
                </span>
                <span className="text-[var(--zd-text-muted)]">•</span>
                <span className="text-[var(--zd-text-primary)] font-medium">
                  {resultMeta
                    ? `${resultMeta.type.toUpperCase()}${resultMeta.count !== undefined ? ` [${resultMeta.count} ${resultMeta.count === 1 ? 'item' : 'items'}]` : ''}`
                    : 'READY'}
                </span>
                <span className="text-[var(--zd-text-muted)]">•</span>
                <span className="text-[var(--zd-text-muted)] flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {evalDurationMs !== null ? `${evalDurationMs}ms` : '<1ms'}
                </span>
                {resultMeta?.sizeBytes !== undefined && (
                  <>
                    <span className="text-[var(--zd-text-muted)]">•</span>
                    <span className="text-[var(--zd-text-muted)]">
                      {formatBytes(resultMeta.sizeBytes)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[var(--zd-text-muted)] font-mono shrink-0">
            <span className="flex items-center gap-1 text-[var(--zd-primary)] font-medium">
              <Zap className="w-2.5 h-2.5" />
              <span>Live Eval</span>
            </span>
            <span className="hidden sm:inline opacity-70">⌘↵ Run</span>
          </div>
        </div>

        {/* Informative Missing Property / Null State Helper */}
        {isNullOrEmptyMatch && availableKeys.length > 0 && (
          <div className="mx-3.5 my-2.5 p-3 rounded-xl bg-[var(--zd-warning-soft)] border border-[var(--zd-warning)]/25 flex flex-col gap-2 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-[var(--zd-warning)] text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No match for &ldquo;{query.trim().slice(0, 30)}&rdquo; in this document</span>
            </div>
            <p className="text-[11px] text-[var(--zd-text-secondary)] leading-relaxed">
              The property does not exist in the root structure. Pick an available property to query:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {availableKeys.map((key) => {
                const targetQuery =
                  filterType === 'jsonpath'
                    ? `$.${key}`
                    : filterType === 'javascript'
                      ? `return data.${key};`
                      : key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuery(targetQuery)}
                    className="px-2 py-0.5 text-xs font-mono rounded-md bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)] hover:text-[var(--zd-primary)] text-[var(--zd-text-primary)] transition-all cursor-pointer shadow-xs"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Code Result Viewport */}
        <div className="flex-1 min-h-0 flex flex-col">
          <CodePanel
            title={`Query Result (${activeOption.label})`}
            language="json"
            value={output}
            readOnly
            showSendTo={false}
            error={error}
            placeholder={`Enter a ${activeOption.label} expression above...`}
            downloadFileName="query_result.json"
            downloadMimeType="application/json"
          />
        </div>
      </div>

      {/* Split Master-Detail Recipe Library Modal */}
      {showRecipesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="max-w-5xl w-full h-[84vh] max-h-[760px] bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-2xl shadow-[var(--zd-shadow-lg)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header: Row 1 - Title, Dialect Tabs, Close */}
            <div className="px-5 py-3 border-b border-[var(--zd-border)] flex items-center justify-between gap-3 bg-[var(--zd-surface)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/20 text-[var(--zd-primary)]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--zd-text-primary)]">
                      Query Recipes &amp; Patterns
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/20">
                      {filteredPresets.length} recipes
                    </span>
                  </div>
                </div>
              </div>

              {/* Dialect Switcher Segmented Control */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--zd-bg)] border border-[var(--zd-border)]">
                {FILTER_TYPES.map((f) => {
                  const isSelected = modalDialect === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setModalDialect(f.id);
                        setSelectedCategory('all');
                        setSelectedPresetIndex(0);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                        isSelected
                          ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-xs'
                          : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)]'
                      )}
                    >
                      {getDialectIcon(f.id, 'w-3 h-3')}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Close Button with Esc Hint */}
              <button
                type="button"
                onClick={() => setShowRecipesModal(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] transition-colors cursor-pointer text-xs"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono opacity-60">Esc</span>
              </button>
            </div>

            {/* Modal Header: Row 2 - Search & Category Pills */}
            <div className="px-5 py-2.5 border-b border-[var(--zd-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--zd-surface-raised)] shrink-0">
              {/* Search Bar */}
              <div className="flex-1 min-w-[220px] max-w-sm flex items-center gap-2 px-2.5 py-1.5 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-xl focus-within:border-[var(--zd-primary)] focus-within:ring-1 focus-within:ring-[var(--zd-primary)]/20">
                <Search className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => {
                    setPresetSearch(e.target.value);
                    setSelectedPresetIndex(0);
                  }}
                  placeholder="Search recipes (e.g. sum, filter, sort)..."
                  className="w-full bg-transparent text-xs outline-none text-[var(--zd-text-primary)] placeholder:text-[var(--zd-text-muted)]"
                />
                {presetSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setPresetSearch('');
                      setSelectedPresetIndex(0);
                    }}
                    className="text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedPresetIndex(0);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                      selectedCategory === cat.id
                        ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/40 font-semibold shadow-xs'
                        : 'bg-[var(--zd-surface)] border border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-primary)]/30'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Master-Detail Body */}
            <div className="flex-1 min-h-0 flex flex-row overflow-hidden divide-x divide-[var(--zd-border)]">
              {/* Left Pane: Master List of Recipes */}
              <div className="w-[320px] md:w-[360px] shrink-0 flex flex-col bg-[var(--zd-surface)]/50">
                <div className="px-3.5 py-2 border-b border-[var(--zd-border)]/70 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--zd-text-muted)] select-none">
                  <span>Recipes ({filteredPresets.length})</span>
                  <span className="text-[10px] font-mono lowercase">↑↓ navigate</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
                  {filteredPresets.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-1.5 text-[var(--zd-text-muted)] px-3">
                      <Search className="w-6 h-6 opacity-40 mb-1" />
                      <p className="text-xs font-medium">No recipes match &ldquo;{presetSearch}&rdquo;</p>
                      <p className="text-[11px]">Try clearing your search or switching categories.</p>
                    </div>
                  ) : (
                    filteredPresets.map((preset, idx) => {
                      const isSelected = idx === selectedPresetIndex;
                      return (
                        <button
                          key={preset.label}
                          ref={isSelected ? selectedItemRef : null}
                          type="button"
                          onClick={() => setSelectedPresetIndex(idx)}
                          onDoubleClick={() => handleApplyRecipe(preset.query, modalDialect)}
                          className={cn(
                            'w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer select-none group',
                            isSelected
                              ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)]/60 text-[var(--zd-primary)] shadow-xs ring-1 ring-[var(--zd-primary)]/20'
                              : 'border-transparent hover:bg-[var(--zd-surface)] hover:border-[var(--zd-border)] text-[var(--zd-text-primary)]'
                          )}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold truncate group-hover:text-[var(--zd-primary)]">
                              {preset.label}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[var(--zd-bg)] text-[var(--zd-text-muted)] border border-[var(--zd-border)]/50 shrink-0">
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--zd-text-muted)] line-clamp-1 leading-snug">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Pane: Detail & Preview Inspector */}
              <div className="flex-1 min-w-0 flex flex-col bg-[var(--zd-bg)] p-5 overflow-y-auto scrollbar-thin">
                {selectedPreset ? (
                  <div className="flex flex-col gap-4">
                    {/* Detail Header & Action Buttons */}
                    <div className="flex flex-col gap-2 pb-3 border-b border-[var(--zd-border)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/30">
                              {modalDialect}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)] border border-[var(--zd-border)]">
                              {selectedPreset.category}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[var(--zd-text-primary)]">
                            {selectedPreset.label}
                          </h3>
                        </div>

                        {/* Actions: Copy & Use Recipe */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyRecipeCode(selectedPreset.query, selectedPreset.label)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-secondary)] transition-colors cursor-pointer"
                          >
                            {copiedRecipeLabel === selectedPreset.label ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyRecipe(selectedPreset.query, modalDialect)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--zd-primary)] hover:bg-[var(--zd-primary-hover,var(--zd-primary))] text-[var(--zd-primary-foreground)] shadow-xs transition-transform active:scale-98 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Use in Editor</span>
                            <span className="ml-1 opacity-70 font-mono text-[10px]">↵</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--zd-text-secondary)] leading-relaxed">
                        {selectedPreset.description}
                      </p>
                    </div>

                    {/* Code Snippet Box */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                        <span>Expression Syntax</span>
                        <span className="font-mono lowercase text-[10px] opacity-70">
                          {modalDialect}
                        </span>
                      </div>
                      <div className="relative rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] p-3.5 overflow-x-auto shadow-2xs">
                        <pre className="font-mono text-xs text-emerald-400 whitespace-pre leading-relaxed scrollbar-thin">
                          {selectedPreset.query}
                        </pre>
                      </div>
                    </div>

                    {/* Output Preview (Live or Example) */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                        {livePreview ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Live Evaluation (On Your Loaded Document)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[var(--zd-text-muted)]">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Expected Output Sample</span>
                          </div>
                        )}
                      </div>

                      <div className="relative rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] p-3.5 overflow-x-auto shadow-2xs">
                        <pre
                          className={cn(
                            'font-mono text-xs whitespace-pre leading-relaxed max-h-56 overflow-y-auto scrollbar-thin',
                            livePreview ? 'text-[var(--zd-info)]' : 'text-[var(--zd-text-secondary)]'
                          )}
                        >
                          {livePreview || selectedPreset.exampleOutput || '// No preview available'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center flex flex-col items-center justify-center gap-2 text-[var(--zd-text-muted)]">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <p className="text-sm font-medium">Select a recipe to view details and preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Keyboard Helper */}
            <div className="px-5 py-2 border-t border-[var(--zd-border)] bg-[var(--zd-surface)] flex items-center justify-between text-[11px] text-[var(--zd-text-muted)] font-mono shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.2 rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]">↑</span>
                  <span className="px-1.5 py-0.2 rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]">↓</span>
                  <span>Navigate</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Enter to Apply</span>
                </span>
                <span>•</span>
                <span>Double click item to insert</span>
              </div>

              <div>
                <span>Press Esc to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidePanelShell>
  );
}
