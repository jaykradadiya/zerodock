import { Link2, Table, Eye, Code2 } from 'lucide-react';
import type { ConversionOptions } from '../utils/converter';

interface OptionsToolbarProps {
  options: ConversionOptions;
  onOptionsChange: (newOptions: Partial<ConversionOptions>) => void;
  inputViewMode: 'paste' | 'source';
  onInputViewModeChange: (mode: 'paste' | 'source') => void;
}

export function OptionsToolbar({
  options,
  onOptionsChange,
  inputViewMode,
  onInputViewModeChange,
}: OptionsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      {/* View Mode Toggle: Interactive Paste vs Raw HTML */}
      <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] p-0.5 rounded-lg border border-[var(--zd-border)]">
        <button
          type="button"
          onClick={() => onInputViewModeChange('paste')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            inputViewMode === 'paste'
              ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-xs font-semibold'
              : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)]'
          }`}
          title="Interactive paste zone for Google Docs rich text"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Rich Paste</span>
        </button>

        <button
          type="button"
          onClick={() => onInputViewModeChange('source')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            inputViewMode === 'source'
              ? 'bg-[var(--zd-primary)] text-[var(--zd-primary-foreground)] shadow-xs font-semibold'
              : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)]'
          }`}
          title="View and edit underlying HTML markup"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>HTML Source</span>
        </button>
      </div>

      {/* Formatting Feature Flags */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOptionsChange({ stripGoogleRedirects: !options.stripGoogleRedirects })}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded-md border transition-colors ${
            options.stripGoogleRedirects
              ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border-[var(--zd-border-glow)] font-medium'
              : 'text-[var(--zd-text-muted)] border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)]'
          }`}
          title="Clean Google redirect tracking URLs (google.com/url?q=...)"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Clean Redirects</span>
        </button>

        <button
          type="button"
          onClick={() => onOptionsChange({ tableFormatting: !options.tableFormatting })}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded-md border transition-colors ${
            options.tableFormatting
              ? 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border-[var(--zd-border-glow)] font-medium'
              : 'text-[var(--zd-text-muted)] border-[var(--zd-border)] hover:bg-[var(--zd-surface-raised)]'
          }`}
          title="Convert HTML tables to GitHub-Flavored Markdown tables"
        >
          <Table className="w-3.5 h-3.5" />
          <span>GFM Tables</span>
        </button>

        <button
          type="button"
          onClick={() => onOptionsChange({ boldMarker: options.boldMarker === '**' ? '__' : '**' })}
          className="inline-flex items-center px-2 py-1 text-xs font-mono rounded-md border border-[var(--zd-border)] text-[var(--zd-text-secondary)] hover:bg-[var(--zd-surface-raised)] transition-colors"
          title="Toggle bold marker between ** and __"
        >
          <span>Bold: {options.boldMarker}text{options.boldMarker}</span>
        </button>
      </div>
    </div>
  );
}
