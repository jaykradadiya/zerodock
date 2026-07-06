import { X, Lightbulb } from 'lucide-react';
import { toolTips } from '../data/toolTips';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';

export function ToolTipBanner({ toolId }: { toolId: string }) {
  const tip = toolTips[toolId];
  const { dismissedTips, dismissTip, tipsHidden, hideAllTips } = usePreferenceStore();

  if (!tip || tipsHidden || dismissedTips.includes(toolId)) return null;

  return (
    <div
      role="note"
      className="w-full mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/20 text-sm text-[var(--zd-text-secondary)] shrink-0"
    >
      <Lightbulb className="w-4 h-4 text-[var(--zd-primary)] shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 m-0 leading-relaxed">{tip}</p>
      <button
        type="button"
        onClick={hideAllTips}
        className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] shrink-0"
      >
        Hide tips
      </button>
      <button
        type="button"
        onClick={() => dismissTip(toolId)}
        className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors shrink-0"
        aria-label="Dismiss tip"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
