import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { toolTips } from '../data/toolTips';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';

export function ToolTipBanner({ toolId }: { toolId: string }) {
  const tip = toolTips[toolId];
  const { dismissedTips, dismissTip, tipsHidden, hideAllTips } = usePreferenceStore();

  // Instant synchronous localStorage check to prevent async IndexedDB hydration flicker
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      const globHidden = localStorage.getItem('zerodock_tips_hidden') === 'true';
      const toolHidden = localStorage.getItem(`zerodock_dismissed_${toolId}`) === 'true';
      return globHidden || toolHidden;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (tipsHidden || dismissedTips.includes(toolId)) {
      setIsDismissed(true);
    }
  }, [tipsHidden, dismissedTips, toolId]);

  if (!tip || tipsHidden || isDismissed || dismissedTips.includes(toolId)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('zerodock_tips_hidden', 'true');
      localStorage.setItem(`zerodock_dismissed_${toolId}`, 'true');
    } catch {}
    dismissTip(toolId);
    hideAllTips();
  };

  return (
    <div
      role="note"
      className="w-full mb-3 flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-[var(--zd-primary-soft)]/60 border border-[var(--zd-primary)]/20 text-xs text-[var(--zd-text-secondary)] shrink-0 transition-all select-none"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Lightbulb className="w-3.5 h-3.5 text-[var(--zd-primary)] shrink-0" aria-hidden />
        <p className="m-0 leading-relaxed truncate">{tip}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] font-medium transition-colors"
        >
          Hide tips
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
