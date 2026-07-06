import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUIStore } from '../../core/store/useUIStore';
import { Button } from './ui';

const shortcuts = [
  { keys: '⌘ K', action: 'Open command palette' },
  { keys: '⌘ ↵', action: 'Primary action (format, convert, send)' },
  { keys: '⌘ ⇧ C', action: 'Copy output' },
  { keys: '⌘ ⌫', action: 'Clear input' },
  { keys: '⌘ .', action: 'Toggle focus mode' },
  { keys: 'Esc', action: 'Close palette / exit focus mode' },
  { keys: '?', action: 'Show this help' },
];

export function KeyboardShortcutsHelp() {
  const { shortcutsOpen, setShortcutsOpen } = useUIStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShortcutsOpen(!useUIStore.getState().shortcutsOpen);
      }
      if (e.key === 'Escape' && useUIStore.getState().shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setShortcutsOpen, shortcutsOpen]);

  if (!shortcutsOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setShortcutsOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-md bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-2xl shadow-[var(--zd-shadow-lg)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--zd-border)]">
          <h2 className="text-base font-bold text-[var(--zd-text-primary)] m-0">Keyboard shortcuts</h2>
          <Button variant="icon" size="sm" onClick={() => setShortcutsOpen(false)} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ul className="p-3 m-0 list-none">
          {shortcuts.map(({ keys, action }) => (
            <li key={keys} className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg">
              <span className="text-sm text-[var(--zd-text-secondary)]">{action}</span>
              <kbd className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[var(--zd-text-muted)] shrink-0">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
