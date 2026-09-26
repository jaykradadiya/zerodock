import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileJson, Plus, X, Search, ChevronDown, Check } from 'lucide-react';
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
  const tabDropdownRef = useRef<HTMLDivElement | null>(null);
  const tabsStripRef = useRef<HTMLDivElement | null>(null);
  const [showTabDropdown, setShowTabDropdown] = React.useState(false);
  const [tabSearchQuery, setTabSearchQuery] = React.useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the active tab visible when switching or after many tabs pile up
  useEffect(() => {
    if (!activeTabId || !tabsStripRef.current) return;
    const el = tabsStripRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [activeTabId, tabs.length]);

  const filteredTabs = tabs.filter((tab) =>
    tab.name.toLowerCase().includes(tabSearchQuery.toLowerCase())
  );

  return (
    <div className="flex items-center justify-between bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 h-10 select-none">
      {/* Scrollable Tabs strip */}
      <div
        ref={tabsStripRef}
        className="flex-1 flex items-center h-full overflow-x-auto scrollbar-none"
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-3 sm:px-3.5 h-full border-r border-[var(--zd-border)] cursor-pointer transition-all duration-150 shrink-0 select-none',
                  isActive
                    ? 'z-[1] bg-[var(--zd-bg)] text-[var(--zd-text-primary)] font-semibold border-t-2 border-t-[var(--zd-primary)] min-w-fit max-w-[450px]'
                    : 'border-t-2 border-t-transparent text-[var(--zd-text-muted)] hover:text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)]/25 min-w-[120px] max-w-[180px]'
                )}
              >
                <FileJson
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-colors',
                    isActive ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'
                  )}
                />

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
                    className="flex-1 min-w-[140px] text-xs bg-[var(--zd-surface-raised)] border border-[var(--zd-primary)] rounded px-1.5 py-0.5 outline-none text-[var(--zd-text-primary)] font-medium focus:ring-1 focus:ring-[var(--zd-primary)]"
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

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  title="Close tab"
                  className={cn(
                    'p-0.5 rounded transition-all shrink-0 ml-auto',
                    isActive
                      ? 'opacity-80 hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)]'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] text-[var(--zd-text-muted)]'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Tabs Control Area */}
      <div className="flex items-center gap-1 px-2 border-l border-[var(--zd-border)] bg-[var(--zd-surface-raised)] h-full shrink-0 relative">
        <button
          type="button"
          onClick={() => addTab()}
          className="p-1.5 text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] rounded-md transition-colors flex items-center gap-1 text-xs font-medium"
          title="New Tab (Alt+T or Cmd+M)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Tab Dropdown / Search */}
        {tabs.length > 0 && (
          <div className="relative flex items-center" ref={tabDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowTabDropdown(!showTabDropdown);
                setTabSearchQuery('');
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]',
                showTabDropdown && 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)]'
              )}
              title="Search and jump to tab"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showTabDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-xl shadow-[var(--zd-shadow-lg)] z-50 p-2 flex flex-col gap-2 backdrop-blur-md">
                <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--zd-border)] bg-[var(--zd-surface)] rounded-lg">
                  <Search className="w-3.5 h-3.5 text-[var(--zd-text-muted)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter tabs..."
                    value={tabSearchQuery}
                    onChange={(e) => setTabSearchQuery(e.target.value)}
                    className="bg-transparent text-xs w-full outline-none text-[var(--zd-text-primary)]"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                  {filteredTabs.length === 0 ? (
                    <span className="text-center text-xs text-[var(--zd-text-muted)] py-3">
                      No matching tabs
                    </span>
                  ) : (
                    filteredTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowTabDropdown(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                          activeTabId === tab.id
                            ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] font-semibold'
                            : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-primary-soft)]/50 hover:text-[var(--zd-primary)]'
                        )}
                      >
                        <FileJson className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1">{tab.name}</span>
                        {activeTabId === tab.id && <Check className="w-3 h-3 text-[var(--zd-primary)] shrink-0" />}
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
  );
}
