import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { toolRegistry } from '../../core/registry/tools';
import { Menu, X, ChevronRight, Home, History, Wrench, Trash2, Copy, Check, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { useHistoryStore } from '../../core/store/useHistoryStore';
import { useUIStore } from '../../core/store/useUIStore';
import { playSound } from '../utils/sound';

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<'tools' | 'history'>('tools');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const routerState = useRouterState();
  const navigate = useNavigate();
  const { recentTools, soundEnabled } = usePreferenceStore();
  const { items: historyItems, removeHistoryItem, clearHistory } = useHistoryStore();

  const currentPath = routerState.location.pathname;
  const currentTool = toolRegistry.find((t) => t.route === currentPath);

  // Group tools by category
  const categories = Array.from(new Set(toolRegistry.map((t) => t.category)));

  const handleCopyPreview = async (e: React.MouseEvent, id: string, text?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (soundEnabled) playSound('tick');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeHistoryItem(id);
    if (soundEnabled) playSound('tick');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden mt-16 bg-[var(--zd-bg)]">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex-col bg-[var(--zd-surface)]/95 backdrop-blur-xl border-r border-[var(--zd-border)]/80 lg:relative lg:flex lg:translate-x-0 shadow-[1px_0_15px_rgba(0,0,0,0.1)] ${
          sidebarOpen ? 'flex' : 'hidden lg:flex'
        }`}
        style={{
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile Logo Header */}
        <div className="flex lg:hidden h-16 shrink-0 items-center justify-between px-5 border-b border-[var(--zd-border)]/80 bg-[var(--zd-surface)]">
          <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 no-underline group">
            <div className="w-8 h-8 rounded-lg bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center shadow-[0_0_15px_var(--zd-glow)] transition-transform group-hover:scale-105">
              <span className="font-mono font-bold text-base bg-gradient-to-br from-[var(--zd-primary)] to-[var(--zd-accent)] bg-clip-text text-transparent">
                Z
              </span>
            </div>
            <span className="font-bold text-[var(--zd-text-primary)] text-lg tracking-tight">ZeroDock</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)] hover:text-[var(--zd-text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Pill Switcher (Tools / History) */}
        <div className="p-2.5 mx-3 mt-3 mb-1 bg-[var(--zd-bg)]/90 rounded-xl border border-[var(--zd-border)]/70 shadow-inner">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/80'
                  : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)]/40 font-medium border border-transparent'
              }`}
            >
              <Wrench size={13} className={activeTab === 'tools' ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'} />
              <span>Tools</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer relative ${
                activeTab === 'history'
                  ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] font-semibold shadow-xs border border-[var(--zd-border)]/80'
                  : 'text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)]/40 font-medium border border-transparent'
              }`}
            >
              <History size={13} className={activeTab === 'history' ? 'text-[var(--zd-primary)]' : 'text-[var(--zd-text-muted)]'} />
              <span>History</span>
              {historyItems.length > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'history'
                    ? 'bg-[var(--zd-primary)] text-white'
                    : 'bg-[var(--zd-surface-raised)] text-[var(--zd-text-secondary)] border border-[var(--zd-border)]/60'
                }`}>
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Body */}
        <div className="flex-1 overflow-y-auto py-3 px-3 custom-scrollbar">
          {activeTab === 'tools' ? (
            <>
              {/* Recent Tools Section */}
              {recentTools.length > 0 && (
                <div className="mb-5 pt-1">
                  <div className="flex items-center justify-between px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--zd-text-muted)]/80">
                    <span>Quick Access</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--zd-surface-raised)] text-[var(--zd-text-muted)] font-mono">
                      {recentTools.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {recentTools
                      .map((id) => toolRegistry.find((t) => t.id === id))
                      .filter(Boolean)
                      .map((tool) => {
                        const Icon = tool!.icon as LucideIcon;
                        const isActive = currentPath === tool!.route;
                        return (
                          <Link
                            key={`recent-${tool!.id}`}
                            to={tool!.route as any}
                            onClick={() => setSidebarOpen(false)}
                            className={`group relative flex items-center justify-between px-3 py-2 my-0.5 rounded-xl text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-[var(--zd-primary-soft)]/80 text-[var(--zd-primary)] font-semibold shadow-2xs border border-[var(--zd-primary)]/25'
                                : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]/70 hover:text-[var(--zd-text-primary)] border border-transparent hover:border-[var(--zd-border)]/50'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeSidebarIndicatorQuick"
                                className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--zd-primary)] rounded-r-full shadow-[0_0_8px_var(--zd-glow)]"
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                              />
                            )}
                            <div className="flex items-center gap-3 truncate">
                              <div className={`p-1.5 rounded-lg transition-colors ${
                                isActive ? 'bg-[var(--zd-primary)]/20 text-[var(--zd-primary)]' : 'bg-[var(--zd-bg)] text-[var(--zd-text-muted)] group-hover:text-[var(--zd-text-primary)] group-hover:bg-[var(--zd-surface)]'
                              }`}>
                                <Icon size={14} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                              </div>
                              <span className="truncate tracking-tight text-xs font-medium">{tool!.name}</span>
                            </div>
                            <ChevronRight size={13} className={`shrink-0 transition-all duration-200 ${
                              isActive ? 'text-[var(--zd-primary)] opacity-80 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0'
                            }`} />
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Categorized Tools */}
              {categories.map((category) => {
                const categoryTools = toolRegistry.filter((t) => t.category === category);
                return (
                  <div key={category} className="mb-6">
                    <div className="flex items-center gap-2 px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--zd-text-muted)]/75">
                      <span className="shrink-0">{category}</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--zd-border)]/70 to-transparent" />
                    </div>
                    <div className="space-y-1">
                      {categoryTools.map((tool) => {
                        const Icon = tool.icon as LucideIcon;
                        const isActive = currentPath === tool.route;
                        return (
                          <Link
                            key={tool.id}
                            to={tool.route as any}
                            onClick={() => setSidebarOpen(false)}
                            className={`group relative flex items-center justify-between px-3 py-2 my-0.5 rounded-xl text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-[var(--zd-primary-soft)]/80 text-[var(--zd-primary)] font-semibold shadow-2xs border border-[var(--zd-primary)]/25'
                                : 'text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)]/70 hover:text-[var(--zd-text-primary)] border border-transparent hover:border-[var(--zd-border)]/50'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeSidebarIndicator"
                                className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--zd-primary)] rounded-r-full shadow-[0_0_8px_var(--zd-glow)]"
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                              />
                            )}
                            <div className="flex items-center gap-3 truncate">
                              <div className={`p-1.5 rounded-lg transition-colors ${
                                isActive ? 'bg-[var(--zd-primary)]/20 text-[var(--zd-primary)]' : 'bg-[var(--zd-bg)] text-[var(--zd-text-muted)] group-hover:text-[var(--zd-text-primary)] group-hover:bg-[var(--zd-surface)]'
                              }`}>
                                <Icon size={15} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                              </div>
                              <span className="truncate tracking-tight text-xs">{tool.name}</span>
                            </div>
                            <ChevronRight size={13} className={`shrink-0 transition-all duration-200 ${
                              isActive ? 'text-[var(--zd-primary)] opacity-80 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0'
                            }`} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* History Tab Content */
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-[var(--zd-border)]/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--zd-text-muted)]">
                  Activity Log
                </span>
                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all operation history?')) clearHistory();
                    }}
                    className="text-[11px] font-mono font-semibold text-red-500 hover:text-red-400 transition-colors cursor-pointer px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 text-center text-[var(--zd-text-muted)] gap-3 bg-[var(--zd-bg)]/40 rounded-2xl border border-dashed border-[var(--zd-border)]/60 mx-1 mt-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] flex items-center justify-center">
                    <Sparkles size={16} className="opacity-60 text-[var(--zd-primary)]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-[var(--zd-text-secondary)]">No history logged</span>
                    <span className="text-[11px] leading-relaxed">Your generated keys, hashes, and processed payloads will appear here automatically.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((item) => {
                    const tool = toolRegistry.find((t) => t.id === item.toolId);
                    const Icon = (tool?.icon as LucideIcon) || Wrench;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => {
                          setSidebarOpen(false);
                          const targetRoute = tool?.route || `/`;
                          navigate({ to: targetRoute as any });
                        }}
                        className="group p-3 rounded-xl bg-[var(--zd-bg)]/80 hover:bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]/70 hover:border-[var(--zd-border-hover)] transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--zd-primary)]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <div className="p-1 rounded bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50">
                              <Icon size={12} className="shrink-0" />
                            </div>
                            <span className="text-xs font-semibold text-[var(--zd-text-primary)] truncate">
                              {item.toolName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.preview && (
                              <button
                                type="button"
                                title="Copy snippet"
                                onClick={(e) => handleCopyPreview(e, item.id, item.preview)}
                                className="p-1 rounded-md bg-[var(--zd-surface)] hover:bg-[var(--zd-primary-soft)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] border border-[var(--zd-border)]/60 transition-colors"
                              >
                                {copiedId === item.id ? <Check size={12} className="text-[var(--zd-accent)]" /> : <Copy size={12} />}
                              </button>
                            )}
                            <button
                              type="button"
                              title="Delete entry"
                              onClick={(e) => handleRemoveHistory(e, item.id)}
                              className="p-1 rounded-md bg-[var(--zd-surface)] hover:bg-red-500/10 text-[var(--zd-text-secondary)] hover:text-red-500 border border-[var(--zd-border)]/60 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] font-medium text-[var(--zd-text-secondary)] leading-snug">
                          {item.action}
                        </div>

                        {item.preview && (
                          <div className="font-mono text-[10px] bg-[var(--zd-surface)] px-2 py-1.5 rounded-lg border border-[var(--zd-border)]/60 text-[var(--zd-text-muted)] truncate shadow-inner">
                            {item.preview}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-[var(--zd-text-muted)] flex items-center gap-1 font-mono">
                            <Clock size={10} />
                            {formatTimestamp(item.timestamp)}
                          </span>
                          {copiedId === item.id && (
                            <span className="text-[10px] font-mono font-bold text-[var(--zd-accent)]">Copied!</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Footer Navigation */}
        <div className="mt-auto p-3 border-t border-[var(--zd-border)]/80 bg-[var(--zd-surface-raised)]/20 flex flex-col gap-2">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] bg-[var(--zd-surface)] hover:bg-[var(--zd-surface-raised)] border border-[var(--zd-border)]/80 hover:border-[var(--zd-border-hover)] transition-all group shadow-2xs"
          >
            <div className="p-1.5 rounded-lg bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] group-hover:scale-110 transition-transform">
              <Home size={14} />
            </div>
            <span>Back to Dashboard</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-bg)] text-[var(--zd-text-muted)] border border-[var(--zd-border)]/50">ESC</span>
          </Link>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--zd-bg)]">
        {/* Mobile Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--zd-border)] bg-[var(--zd-surface)] px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)] transition-colors"
            >
              <Menu size={20} />
            </button>
            <span className="font-semibold text-sm text-[var(--zd-text-primary)] tracking-tight">
              {currentTool?.name || 'ZeroDock'}
            </span>
          </div>
          <Link
            to="/"
            className="p-1.5 -mr-1.5 rounded-lg text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors"
            title="Back to Dashboard"
          >
            <Home size={18} />
          </Link>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}
