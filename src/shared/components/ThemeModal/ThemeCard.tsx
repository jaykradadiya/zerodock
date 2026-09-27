import type { ThemeDefinition } from '../../../core/theme/types';
import { Check, Copy, Trash2, Sliders, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface ThemeCardProps {
  theme: ThemeDefinition;
  isActive: boolean;
  isCustom: boolean;
  onSelect: (themeId: string) => void;
  onCustomize: (themeId: string) => void;
  onDuplicate: (theme: ThemeDefinition) => void;
  onDelete?: (themeId: string) => void;
}

export function ThemeCard({
  theme,
  isActive,
  isCustom,
  onSelect,
  onCustomize,
  onDuplicate,
  onDelete,
}: ThemeCardProps) {
  const { tokens } = theme;

  return (
    <div
      onClick={() => onSelect(theme.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(theme.id);
        }
      }}
      className={`group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--zd-primary)] ${
        isActive
          ? 'bg-[var(--zd-primary-soft)] border-[var(--zd-primary)] shadow-[0_0_20px_var(--zd-glow)]'
          : 'bg-[var(--zd-surface)] border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] hover:bg-[var(--zd-surface-raised)]'
      }`}
    >
      <div>
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-[var(--zd-text-primary)] truncate">
                {theme.name}
              </span>
              {Boolean(theme.tokens['--zd-glow']) && (
                <Sparkles className="w-3 h-3 text-[var(--zd-primary)]" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[var(--zd-text-muted)] uppercase tracking-wider">
                {theme.mode}
              </span>
              {theme.isHighContrast && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/40">
                  High Contrast
                </span>
              )}
              {isCustom && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--zd-accent-soft)] text-[var(--zd-accent)] border border-[var(--zd-accent)]/30">
                  Custom
                </span>
              )}
              {theme.author && (
                <span className="text-[11px] text-[var(--zd-text-muted)] truncate max-w-[120px]">
                  by {theme.author}
                </span>
              )}
            </div>
          </div>

          {/* Active checkmark */}
          {isActive && (
            <div className="w-5 h-5 rounded-full bg-[var(--zd-primary)] text-[var(--zd-bg)] flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--zd-text-secondary)] line-clamp-2 mb-3.5 min-h-[32px]">
          {theme.description}
        </p>

        {/* Color Palette Swatches */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--zd-bg)] border border-[var(--zd-border)] mb-3">
          <div
            className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-xs"
            style={{ backgroundColor: tokens['--zd-bg'] }}
            title={`Background: ${tokens['--zd-bg']}`}
          />
          <div
            className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-xs"
            style={{ backgroundColor: tokens['--zd-surface'] }}
            title={`Surface: ${tokens['--zd-surface']}`}
          />
          <div
            className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-xs"
            style={{ backgroundColor: tokens['--zd-primary'] }}
            title={`Primary: ${tokens['--zd-primary']}`}
          />
          <div
            className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-xs"
            style={{ backgroundColor: tokens['--zd-accent'] }}
            title={`Accent: ${tokens['--zd-accent']}`}
          />
          <div
            className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-xs"
            style={{ backgroundColor: tokens['--zd-text-primary'] }}
            title={`Text: ${tokens['--zd-text-primary']}`}
          />
          <div className="ml-auto flex items-center text-[10px] font-mono text-[var(--zd-text-muted)]">
            {tokens['--zd-primary']}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center gap-1.5 pt-2 border-t border-[var(--zd-border)]/60"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant={isActive ? 'primary' : 'secondary'}
          onClick={() => onSelect(theme.id)}
          className="flex-1 !h-7 text-xs font-semibold"
        >
          {isActive ? 'Active' : 'Apply'}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCustomize(theme.id)}
          title="Customize color tokens"
          aria-label="Customize theme colors"
          className="!h-7 !w-7 !p-0 text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)]"
        >
          <Sliders className="w-3.5 h-3.5" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDuplicate(theme)}
          title="Clone & customize"
          aria-label="Clone theme"
          className="!h-7 !w-7 !p-0 text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)]"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>

        {isCustom && onDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(theme.id)}
            title="Delete custom theme"
            aria-label="Delete custom theme"
            className="!h-7 !w-7 !p-0 text-[var(--zd-error)] hover:bg-[var(--zd-error)]/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
