import { ArrowRightLeft } from 'lucide-react';
import { Button } from './ui';

interface MobileSwapBarProps {
  onSwap: () => void;
  onFocusInput?: () => void;
  onFocusOutput?: () => void;
  activePanel?: 'input' | 'output';
  swapLabel?: string;
}

export function MobileSwapBar({
  onSwap,
  onFocusInput,
  onFocusOutput,
  activePanel = 'input',
  swapLabel = 'Swap',
}: MobileSwapBarProps) {
  if (!onFocusInput && !onFocusOutput) {
    return (
      <div className="flex md:hidden items-center justify-center gap-2 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0">
        <Button variant="secondary" size="sm" onClick={onSwap} aria-label={swapLabel}>
          <ArrowRightLeft className="w-4 h-4" />
          {swapLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0">
      <div className="flex flex-1 gap-1 p-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg">
        <button
          type="button"
          onClick={onFocusInput}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activePanel === 'input'
              ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)]'
              : 'text-[var(--zd-text-muted)]'
          }`}
        >
          Input
        </button>
        <button
          type="button"
          onClick={onFocusOutput}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activePanel === 'output'
              ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)]'
              : 'text-[var(--zd-text-muted)]'
          }`}
        >
          Output
        </button>
      </div>
      <Button variant="secondary" size="sm" onClick={onSwap} aria-label={swapLabel} className="shrink-0">
        <ArrowRightLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}
