import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileJson, Plus, X, Search, ChevronDown, Check, Layers, Columns2, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../../../shared/components/ui';

export interface TabItem {
  id: string;
  name: string;
  size?: number;
}

export interface JsonTabBarProps {
  tabs: TabItem[];
  allWorkspaceTabs?: TabItem[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  addTab: (name?: string, content?: string) => void;
  removeTab: (id: string) => void;
  renameTab: (id: string, newName: string) => void;
  editingTabId: string | null;
  setEditingTabId: (id: string | null) => void;
  editingTabName: string;
  setEditingTabName: (name: string) => void;
  isSplit?: boolean;
  onToggleSplit?: () => void;
  rightActions?: React.ReactNode;
  onMoveToOtherGroup?: (tabId: string) => void;
  moveToGroupLabel?: string;
  paneLabel?: string;
  isActivePane?: boolean;
  onFocusPane?: () => void;
}

export function JsonTabBar({
  tabs,
  allWorkspaceTabs,
  activeTabId,
  setActiveTab,
  addTab,
  removeTab,
  renameTab,
  editingTabId,
  setEditingTabId,
  editingTabName,
  setEditingTabName,
  isSplit = false,
  onToggleSplit,
  rightActions,
  onMoveToOtherGroup,
  moveToGroupLabel,
  paneLabel,
  isActivePane = true,
  onFocusPane,
}: JsonTabBarProps) {
  const tabDropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const tabsStripRef = useRef<HTMLDivElement | null>(null);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, right: 12 });
  const [selectedNavIndex, setSelectedNavIndex] = useState(0);

  // Guard against duplicate close calls from rapid mouseup + auxclick on middle click
  const lastMiddleClickTimeRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const handleMiddleClickClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (lastMiddleClickTimeRef.current.id === tabId && now - lastMiddleClickTimeRef.current.time < 300) {
          return;
        }
        lastMiddleClickTimeRef.current = { id: tabId, time: now };
        removeTab(tabId);
      }
    },
    [removeTab]
  );

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

  const otherWorkspaceTabs = React.useMemo(() => {
    if (!allWorkspaceTabs) return [];
    return allWorkspaceTabs.filter((at) => !tabs.some((t) => t.id === at.id));
  }, [allWorkspaceTabs, tabs]);

  const filteredTabs = tabs.filter((tab) =>
    tab.name.toLowerCase().includes(tabSearchQuery.toLowerCase())
  );

  const filteredOtherTabs = otherWorkspaceTabs.filter((tab) =>
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
    <div
      onClick={onFocusPane}
      className={cn(
        'flex items-center justify-between bg-[var(--zd-bg)] border-b border-[var(--zd-border)] shrink-0 h-10 select-none relative z-10 transition-colors duration-150',
        !isActivePane && 'opacity-90'
      )}
    >
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
                onClick={() => {
                  setActiveTab(tab.id);
                  onFocusPane?.();
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    // Prevent browser middle-click autoscroll cursor
                    e.preventDefault();
                  }
                }}
                onMouseUp={(e) => {
                  if (e.button === 1) {
                    handleMiddleClickClose(e, tab.id);
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    handleMiddleClickClose(e, tab.id);
                  }
                }}
                className={cn(
                  'group relative flex items-center gap-2 px-3 sm:px-3.5 cursor-pointer transition-all duration-150 shrink-0 select-none border-r border-[var(--zd-border)]',
                  isActive
                    ? isActivePane
                      ? 'z-20 bg-[var(--zd-surface-raised)]/80 text-[var(--zd-text-primary)] font-semibold border-t-2 border-t-[var(--zd-primary)] -mb-[1px] pb-[1px] border-b border-b-transparent shadow-xs min-w-fit max-w-[420px]'
                      : 'z-20 bg-[var(--zd-surface-raised)]/40 text-[var(--zd-text-secondary)] font-medium border-t-2 border-t-[var(--zd-text-muted)]/60 -mb-[1px] pb-[1px] border-b border-b-transparent shadow-2xs min-w-fit max-w-[420px]'
                    : 'bg-transparent border-t-2 border-t-transparent text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]/30 min-w-[120px] max-w-[180px]'
                )}
              >
                {/* File Icon */}
                <FileJson
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive
                      ? isActivePane
                        ? 'text-[var(--zd-primary)]'
                        : 'text-[var(--zd-text-secondary)]'
                      : 'text-[var(--zd-text-muted)]'
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
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onAuxClick={(e) => e.stopPropagation()}
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
                        ? isActivePane
                          ? 'text-[var(--zd-text-primary)] font-semibold whitespace-nowrap'
                          : 'text-[var(--zd-text-secondary)] font-medium whitespace-nowrap'
                        : 'text-[var(--zd-text-secondary)] truncate flex-1 min-w-0'
                    )}
                    title={`${tab.name} • Double-click to rename • Middle-click to close`}
                  >
                    {tab.name}
                  </span>
                )}

                {/* Move to other group button (shown on hover if onMoveToOtherGroup is provided) */}
                {onMoveToOtherGroup && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToOtherGroup(tab.id);
                    }}
                    title={moveToGroupLabel || 'Move to other pane'}
                    aria-label={moveToGroupLabel || 'Move to other pane'}
                    className="opacity-0 group-hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)] p-0.5 rounded-md transition-all shrink-0 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 1) e.stopPropagation();
                  }}
                  title="Close tab (✕ or middle-click)"
                  className={cn(
                    'p-0.5 rounded-md transition-all shrink-0 ml-auto',
                    isActive
                      ? 'opacity-70 hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)] cursor-pointer'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)] cursor-pointer'
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

      {/* Far Right: Tab Switcher Dropdown & Split Editor Toggle */}
      <div className="flex items-center gap-1.5 px-2 border-l border-[var(--zd-border)]/60 bg-[var(--zd-bg)] h-full shrink-0">
        {((allWorkspaceTabs && allWorkspaceTabs.length > 1) || tabs.length > 1) && (
          <div className="relative flex items-center">
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
            <span>{tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}</span>
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
                      <span>{paneLabel ? `${paneLabel} Tabs` : 'Open Tabs'}</span>
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
                            onMouseDown={(e) => {
                              if (e.button === 1) {
                                e.preventDefault();
                              }
                            }}
                            onMouseUp={(e) => {
                              if (e.button === 1) {
                                handleMiddleClickClose(e, tab.id);
                                if (tabs.length <= 2) {
                                  setShowTabDropdown(false);
                                }
                              }
                            }}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                handleMiddleClickClose(e, tab.id);
                                if (tabs.length <= 2) {
                                  setShowTabDropdown(false);
                                }
                              }
                            }}
                            title={`${tab.name} • Middle-click to close`}
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

                    {/* Other Workspace Tabs (available to open in this pane) */}
                    {filteredOtherTabs.length > 0 && (
                      <div className="mt-1 pt-1.5 border-t border-[var(--zd-border)]/60">
                        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--zd-text-muted)] flex items-center justify-between">
                          <span>Other Workspace Files</span>
                          <span>Click to open here</span>
                        </div>
                        {filteredOtherTabs.map((tab) => (
                          <div
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setShowTabDropdown(false);
                            }}
                            className="group relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer select-none text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface)] hover:text-[var(--zd-text-primary)]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileJson className="w-3.5 h-3.5 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-primary)] shrink-0 transition-colors" />
                              <span className="truncate">{tab.name}</span>
                            </div>
                            <span className="text-[10px] font-medium text-[var(--zd-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                              Open Here
                            </span>
                          </div>
                        ))}
                      </div>
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

        {rightActions}

        {onToggleSplit && !rightActions && (
          <button
            type="button"
            onClick={onToggleSplit}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer',
              isSplit
                ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/40 shadow-xs font-semibold'
                : 'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)] hover:text-[var(--zd-text-primary)] hover:border-[var(--zd-border-hover)]'
            )}
            title={isSplit ? 'Close Split Editor (⌘\\)' : 'Split Editor Right (⌘\\)'}
            aria-label={isSplit ? 'Close Split Editor' : 'Split Editor Right'}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{isSplit ? 'Split Active' : 'Split'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
