import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { X, Trash2, Copy, Check, Clock, Sparkles, History, Wrench, type LucideIcon } from 'lucide-react';
import { useUIStore } from '../../core/store/useUIStore';
import { useHistoryStore } from '../../core/store/useHistoryStore';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { toolRegistry } from '../../core/registry/tools';
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

export function HistoryDrawer() {
  const { historyDrawerOpen, setHistoryDrawerOpen } = useUIStore();
  const { items: historyItems, removeHistoryItem, clearHistory } = useHistoryStore();
  const { soundEnabled } = usePreferenceStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

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
    <AnimatePresence>
      {historyDrawerOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Side Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--zd-surface)] border-l border-[var(--zd-border)] shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center text-[var(--zd-primary)]">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--zd-text-primary)] leading-tight flex items-center gap-2">
                    Operation History
                    {historyItems.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] text-xs font-mono">
                        {historyItems.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[var(--zd-text-secondary)]">Recent outputs and tool actions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all operation history?')) clearHistory();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--zd-text-secondary)] hover:bg-[var(--zd-bg)] hover:text-[var(--zd-text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[var(--zd-bg)]/50">
              {historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center text-[var(--zd-text-muted)] gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] flex items-center justify-center shadow-inner">
                    <Sparkles className="w-6 h-6 text-[var(--zd-primary)]/60" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <p className="text-sm font-semibold text-[var(--zd-text-primary)]">No activity recorded yet</p>
                    <p className="text-xs text-[var(--zd-text-secondary)]">
                      When you generate hashes, RSA keys, format JSON, or use tools, your local history and snippets will automatically appear here.
                    </p>
                  </div>
                </div>
              ) : (
                historyItems.map((item) => {
                  const tool = toolRegistry.find((t) => t.id === item.toolId);
                  const Icon = (tool?.icon as LucideIcon) || Wrench;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setHistoryDrawerOpen(false);
                        const targetRoute = tool?.route || `/`;
                        navigate({ to: targetRoute as any });
                      }}
                      className="group p-3.5 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-primary)]/50 transition-all cursor-pointer flex flex-col gap-2 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-md bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
                            <Icon size={14} />
                          </div>
                          <span className="text-xs font-bold text-[var(--zd-text-primary)] truncate">
                            {item.toolName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          {item.preview && (
                            <button
                              type="button"
                              title="Copy snippet"
                              onClick={(e) => handleCopyPreview(e, item.id, item.preview)}
                              className="px-2 py-1 rounded-md bg-[var(--zd-bg)] hover:bg-[var(--zd-primary-soft)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] text-[11px] font-medium flex items-center gap-1 transition-colors border border-[var(--zd-border)]"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check size={12} className="text-[var(--zd-accent)]" />
                                  <span className="text-[var(--zd-accent)]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            title="Delete entry"
                            onClick={(e) => handleRemoveHistory(e, item.id)}
                            className="p-1 rounded-md hover:bg-red-500/10 text-[var(--zd-text-secondary)] hover:text-red-500 transition-colors ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-[var(--zd-text-secondary)]">
                        {item.action}
                      </div>

                      {item.preview && (
                        <div className="font-mono text-xs bg-[var(--zd-bg)] p-2.5 rounded-lg border border-[var(--zd-border)]/80 text-[var(--zd-text-primary)] break-all line-clamp-2">
                          {item.preview}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--zd-border)]/40 text-[11px] text-[var(--zd-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span className="text-[10px] text-[var(--zd-primary)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to open tool →
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
