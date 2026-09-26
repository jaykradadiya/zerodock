import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileJson, Plus, X, Search, ChevronDown, Check, Layers } from 'lucide-react';
import { cn } from '../../../../shared/components/ui';

export interface TabItem {
  id: string;
  name: string;
  size?: number;
}

interface JsonTabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  addTab: (name?: string, content?: string) => void;
  removeTab: (id: string) => void;
  renameTab: (id: string, newName: string) => void;
  editingTabId: string | null;
  setEditingTabId: (id: string | null) => void;
  editingTabName: string;
  setEditingTabName: (name: string) => void;
}

export function JsonTabBar({
  tabs,
  activeTabId,
  setActiveTab,
  addTab,
  removeTab,
  renameTab,
  editingTabId,
  setEditingTabId,
  editingTabName,
  setEditingTabName,
}: JsonTabBarProps) {
  const tabDropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const tabsStripRef = useRef<HTMLDivElement | null>(null);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, right: 12 });
  const [selectedNavIndex, setSelectedNavIndex] = useState(0);

  const updateDropdownCoords = useCallback(() => {
    if (tabDropdownButtonRef.current) {
      const rect = tabDropdownButtonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 6,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, []);

  const openDropdown = useCallback(() => {
    updateDropdownCoords();
    const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
    setSelectedNavIndex(activeIdx >= 0 ? activeIdx : 0);
    setTabSearchQuery('');
    setShowTabDropdown(true);
  }, [activeTabId, tabs, updateDropdownCoords]);

  const toggleDropdown = useCallback(() => {
    if (!showTabDropdown) {
      openDropdown();
    } else {
      setShowTabDropdown(false);
    }
  }, [showTabDropdown, openDropdown]);

  useEffect(() => {
    if (!showTabDropdown) return;
    const handleResize = () => updateDropdownCoords();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [showTabDropdown, updateDropdownCoords]);

  // Auto-focus search input whenever dropdown is opened
  useEffect(() => {
    if (showTabDropdown) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [showTabDropdown]);

  // Keep the active tab visible when switching or after many tabs pile up
  useEffect(() => {
    if (!activeTabId || !tabsStripRef.current) return;
    const el = tabsStripRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [activeTabId, tabs.length]);

  const filteredTabs = tabs.filter((tab) =>
    tab.name.toLowerCase().includes(tabSearchQuery.toLowerCase())
  );

  useEffect(() => {
    setSelectedNavIndex(0);
  }, [tabSearchQuery]);

  // Auto-scroll list when navigating with arrow keys
  useEffect(() => {
    if (!showTabDropdown || !listContainerRef.current) return;
    const item = listContainerRef.current.querySelector<HTMLElement>(`[data-nav-index="${selectedNavIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedNavIndex, showTabDropdown]);

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTabs.length === 0) return;
      setSelectedNavIndex((prev) => (prev + 1) % filteredTabs.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTabs.length === 0) return;
      setSelectedNavIndex((prev) => (prev - 1 + filteredTabs.length) % filteredTabs.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredTabs[selectedNavIndex]) {
        setActiveTab(filteredTabs[selectedNavIndex].id);
        setShowTabDropdown(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowTabDropdown(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-[var(--zd-bg)] border-b border-[var(--zd-border)] shrink-0 h-10 select-none relative z-10">
      {/* Scrollable Tabs strip */}
      <div
        ref={tabsStripRef}
        className="flex-1 flex items-stretch h-full overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
        role="tablist"
        aria-label="JSON workspace tabs"
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;

            return (
              <motion.div
                key={tab.id}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={isActive}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-3 sm:px-3.5 cursor-pointer transition-all duration-150 shrink-0 select-none border-r border-[var(--zd-border)]',
                  isActive
                    ? 'z-20 bg-[var(--zd-surface-raised)]/70 text-[var(--zd-text-primary)] font-semibold border-t-2 border-t-[var(--zd-primary)] -mb-[1px] pb-[1px] border-b border-b-transparent shadow-xs min-w-fit max-w-[420px]'
                    : 'bg-transparent border-t-2 border-t-transparent text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]/30 min-w-[120px] max-w-[180px]'
                )}
              >
                {/* File Icon */}
                <FileJson
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'
                  )}
                />

                {/* Tab Label or Inline Rename Input */}
                {isEditing ? (
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
                    className="flex-1 min-w-[120px] text-xs bg-[var(--zd-surface)] border border-[var(--zd-primary)] rounded px-1.5 py-0.5 outline-none text-[var(--zd-text-primary)] font-medium focus:ring-1 focus:ring-[var(--zd-primary)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTabId(tab.id);
                      setEditingTabName(tab.name);
                    }}
                    className={cn(
                      'text-xs tracking-tight transition-colors',
                      isActive
                        ? 'text-[var(--zd-text-primary)] font-semibold whitespace-nowrap'
                        : 'text-[var(--zd-text-secondary)] truncate flex-1 min-w-0'
                    )}
                    title={`${tab.name} (Double-click to rename)`}
                  >
                    {tab.name}
                  </span>
                )}

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  title="Close tab (✕)"
                  className={cn(
                    'p-0.5 rounded-md transition-all shrink-0 ml-auto',
                    isActive
                      ? 'opacity-70 hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)]'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)]'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Plus Button: Positioned directly beside the last tab */}
        <button
          type="button"
          onClick={() => addTab()}
          className="my-auto mx-1.5 p-1 text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface-raised)] rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          title="New Tab (Alt+T or Cmd+M)"
          aria-label="Create new tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Far Right: Tab Switcher Dropdown (when multiple tabs open) */}
      {tabs.length > 1 && (
        <div className="flex items-center px-2.5 border-l border-[var(--zd-border)]/60 bg-[var(--zd-bg)] h-full shrink-0">
          <button
            ref={tabDropdownButtonRef}
            type="button"
            onClick={toggleDropdown}
            className={cn(
              'group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer',
              showTabDropdown
                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/40 shadow-xs'
                : 'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]'
            )}
            title="Search and jump to tab"
            aria-label="Tabs menu"
            aria-expanded={showTabDropdown}
          >
            <Layers className={cn('w-3.5 h-3.5 transition-colors', showTabDropdown ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)]')} />
            <span>{tabs.length} tabs</span>
            <ChevronDown className={cn('w-3 h-3 text-[var(--zd-text-muted)] transition-transform duration-200', showTabDropdown && 'rotate-180 text-[var(--zd-primary)]')} />
          </button>

          {showTabDropdown &&
            createPortal(
              <>
                {/* Backdrop dismiss */}
                <div
                  className="fixed inset-0 z-[80]"
                  onClick={() => setShowTabDropdown(false)}
                  aria-hidden
                />

                {/* Dropdown Card */}
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    top: `${dropdownCoords.top}px`,
                    right: `${dropdownCoords.right}px`,
                  }}
                  className="fixed w-80 max-w-[calc(100vw-24px)] bg-[var(--zd-surface-raised)]/95 backdrop-blur-xl border border-[var(--zd-border-hover)] rounded-xl shadow-[var(--zd-shadow-lg)] z-[90] flex flex-col overflow-hidden"
                  onKeyDown={handleDropdownKeyDown}
                >
                  {/* Header / Title */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--zd-border)]/60 bg-[var(--zd-surface)]/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--zd-text-muted)]">
                      <Layers className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
                      <span>Open Tabs</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--zd-text-muted)] px-1.5 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)]">
                      {filteredTabs.length} of {tabs.length}
                    </span>
                  </div>

                  {/* Filter Search Box */}
                  <div className="p-2 border-b border-[var(--zd-border)]/50">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--zd-border)] bg-[var(--zd-surface)] focus-within:border-[var(--zd-primary)] focus-within:ring-1 focus-within:ring-[var(--zd-primary)]/30 rounded-lg transition-all">
                      <Search className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Filter tabs..."
                        value={tabSearchQuery}
                        onChange={(e) => setTabSearchQuery(e.target.value)}
                        onKeyDown={handleDropdownKeyDown}
                        className="bg-transparent text-xs w-full outline-none text-[var(--zd-text-primary)] placeholder:text-[var(--zd-text-muted)]"
                        autoFocus
                      />
                      {tabSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTabSearchQuery('')}
                          className="text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] p-0.5 rounded transition-colors cursor-pointer"
                          title="Clear filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs List */}
                  <div ref={listContainerRef} className="max-h-60 overflow-y-auto p-1.5 flex flex-col gap-1 custom-scrollbar">
                    {filteredTabs.length === 0 ? (
                      <div className="py-6 px-3 text-center flex flex-col items-center gap-1.5">
                        <Search className="w-5 h-5 text-[var(--zd-text-muted)] opacity-40" />
                        <p className="text-xs font-medium text-[var(--zd-text-secondary)]">No tabs match "{tabSearchQuery}"</p>
                        <button
                          type="button"
                          onClick={() => setTabSearchQuery('')}
                          className="text-[11px] text-[var(--zd-primary)] hover:underline cursor-pointer"
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      filteredTabs.map((tab, idx) => {
                        const isActive = activeTabId === tab.id;
                        const isSelected = selectedNavIndex === idx;

                        return (
                          <div
                            key={tab.id}
                            data-nav-index={idx}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setShowTabDropdown(false);
                            }}
                            onMouseEnter={() => setSelectedNavIndex(idx)}
                            className={cn(
                              'group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-[var(--zd-surface)] text-[var(--zd-text-primary)] ring-2 ring-[var(--zd-primary)] border border-[var(--zd-primary)] shadow-sm'
                                : isActive
                                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-text-primary)] border border-[var(--zd-primary)]/30'
                                : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface)] hover:text-[var(--zd-text-primary)] border border-transparent'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--zd-primary)] shadow-[0_0_8px_var(--zd-primary)] shrink-0 animate-pulse" />
                              )}
                              <FileJson
                                className={cn(
                                  'w-3.5 h-3.5 shrink-0 transition-colors',
                                  isActive || isSelected ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'
                                )}
                              />
                              <span className={cn('truncate text-xs', isSelected ? 'font-semibold text-[var(--zd-text-primary)]' : '')}>{tab.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isActive && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--zd-primary)] bg-[var(--zd-primary)]/10 px-1.5 py-0.5 rounded border border-[var(--zd-primary)]/20">
                                  <Check className="w-3 h-3 text-[var(--zd-primary)]" />
                                  <span>Active</span>
                                </span>
                              )}

                              {isSelected && (
                                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)] font-mono text-[var(--zd-primary)] font-semibold shadow-2xs">
                                  ↵
                                </kbd>
                              )}

                              {/* Quick Close Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTab(tab.id);
                                  if (tabs.length <= 2) {
                                    setShowTabDropdown(false);
                                  }
                                }}
                                title="Close tab"
                                aria-label={`Close ${tab.name}`}
                                className="opacity-0 group-hover:opacity-100 hover:bg-[var(--zd-surface-raised)] hover:text-[var(--zd-text-primary)] text-[var(--zd-text-muted)] p-1 rounded-md transition-all shrink-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer / Quick Actions */}
                  <div className="border-t border-[var(--zd-border)]/60 bg-[var(--zd-surface)]/60 px-3 py-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        addTab();
                        setShowTabDropdown(false);
                      }}
                      className="flex items-center gap-1.5 text-xs text-[var(--zd-primary)] hover:underline font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Tab</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--zd-text-muted)] font-mono">
                      <span>Navigate</span>
                      <kbd className="px-1 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)]">↑↓</kbd>
                      <kbd className="px-1 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)]">↵</kbd>
                    </div>
                  </div>
                </motion.div>
              </>,
              document.body
            )}
        </div>
      )}
    </div>
  );
}
