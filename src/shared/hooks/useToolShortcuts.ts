import { useEffect } from 'react';
import { useUIStore } from '../../core/store/useUIStore';
import { useToastStore } from '../../core/store/useToastStore';

export interface ToolShortcutHandlers {
  onPrimary?: () => void;
  onCopy?: () => void;
  onClear?: () => void;
  primaryLabel?: string;
}

/** Global listener — mount once in ToolRouteShell */
export function useGlobalToolShortcuts() {
  const { toolActions, zenMode, setZenMode } = useUIStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
        return;
      }

      if (mod && e.key === '.') {
        e.preventDefault();
        setZenMode(!zenMode);
        addToast(zenMode ? 'Exited focus mode' : 'Focus mode — navbar hidden', 'info');
        return;
      }

      if (!mod) return;

      if (e.key === 'Enter' && toolActions.onPrimary) {
        e.preventDefault();
        toolActions.onPrimary();
        return;
      }

      if (e.key === 'Backspace' && toolActions.onClear) {
        e.preventDefault();
        toolActions.onClear();
        addToast('Cleared', 'info');
        return;
      }

      if (e.shiftKey && e.key.toLowerCase() === 'c' && toolActions.onCopy) {
        e.preventDefault();
        toolActions.onCopy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toolActions, zenMode, setZenMode, addToast]);
}
