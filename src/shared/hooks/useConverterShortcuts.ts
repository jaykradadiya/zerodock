import { useEffect } from 'react';

interface UseConverterShortcutsOptions {
  onClear?: () => void;
  output?: string;
}

export function useConverterShortcuts({ onClear, output }: UseConverterShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'c' && output) {
        e.preventDefault();
        navigator.clipboard.writeText(output).catch(() => {});
      }
      if (mod && e.key === 'Backspace' && onClear) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        onClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClear, output]);
}
