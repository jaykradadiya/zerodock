import type { ThemeTokens } from '../../../core/theme/types';
import { Search, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface ThemePreviewCardProps {
  tokens: ThemeTokens;
  themeName: string;
}

export function ThemePreviewCard({ tokens, themeName }: ThemePreviewCardProps) {
  const bg = tokens['--zd-bg'];
  const surface = tokens['--zd-surface'];
  const surfaceRaised = tokens['--zd-surface-raised'];
  const primary = tokens['--zd-primary'];
  const primarySoft = tokens['--zd-primary-soft'];
  const accent = tokens['--zd-accent'];
  const textPrimary = tokens['--zd-text-primary'];
  const textSecondary = tokens['--zd-text-secondary'];
  const textMuted = tokens['--zd-text-muted'];
  const border = tokens['--zd-border'];
  const success = tokens['--zd-success'];
  const error = tokens['--zd-error'];
  const editorBg = tokens['editor.background'] || surface;
  const editorFg = tokens['editor.foreground'] || textPrimary;
  const editorLineNum = tokens['editorLineNumber.foreground'] || textMuted;

  return (
    <div
      className="rounded-2xl border p-4 transition-all duration-200 shadow-lg overflow-hidden flex flex-col gap-3.5 select-none"
      style={{
        backgroundColor: bg,
        borderColor: border,
        color: textSecondary,
      }}
    >
      {/* Mini App Header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl border"
        style={{
          backgroundColor: surfaceRaised,
          borderColor: border,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs"
            style={{ backgroundColor: primarySoft, color: primary }}
          >
            Z
          </div>
          <span className="font-extrabold text-xs" style={{ color: textPrimary }}>
            ZeroDock <span style={{ color: primary }}>Studio</span>
          </span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full border"
            style={{
              backgroundColor: `${accent}18`,
              borderColor: `${accent}33`,
              color: accent,
            }}
          >
            Live Preview
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: error }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: success }} />
        </div>
      </div>

      {/* Main Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left: UI Controls Preview */}
        <div
          className="p-3.5 rounded-xl border flex flex-col gap-3 justify-between"
          style={{ backgroundColor: surface, borderColor: border }}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: textMuted }}>
              Controls & Typography
            </div>
            <div className="text-sm font-bold leading-tight mb-1" style={{ color: textPrimary }}>
              {themeName}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: textSecondary }}>
              Every token updates in real time across all tools and panels.
            </div>
          </div>

          {/* Interactive controls simulation */}
          <div className="flex flex-col gap-2 mt-1">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs"
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: textMuted }} />
              <span style={{ color: textMuted }}>Search tools and workflows...</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                style={{ backgroundColor: primary, color: bg }}
              >
                <Sparkles className="w-3 h-3" />
                Primary Action
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  backgroundColor: surfaceRaised,
                  borderColor: border,
                  color: textPrimary,
                }}
              >
                Secondary
              </button>
            </div>
          </div>
        </div>

        {/* Right: Monaco Code Editor Simulation */}
        <div
          className="p-3 rounded-xl border font-mono text-xs flex flex-col justify-between"
          style={{
            backgroundColor: editorBg,
            borderColor: border,
            color: editorFg,
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b mb-2" style={{ borderColor: border }}>
            <span className="text-[11px] font-sans font-semibold" style={{ color: textMuted }}>
              code_editor.tsx
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: primarySoft, color: primary }}
            >
              TypeScript
            </span>
          </div>

          {/* Simulated syntax lines */}
          <div className="space-y-1 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2">
              <span className="w-4 text-right" style={{ color: editorLineNum }}>1</span>
              <span>
                <span style={{ color: accent }}>const</span> <span style={{ color: primary }}>theme</span> = &#123;
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-right" style={{ color: editorLineNum }}>2</span>
              <span className="pl-3">
                <span style={{ color: textSecondary }}>name:</span> <span style={{ color: success }}>"{themeName}"</span>,
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-right" style={{ color: editorLineNum }}>3</span>
              <span className="pl-3">
                <span style={{ color: textSecondary }}>customized:</span> <span style={{ color: accent }}>true</span>,
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-right" style={{ color: editorLineNum }}>4</span>
              <span>&#125;;</span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 pt-2 border-t mt-2" style={{ borderColor: border }}>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: success }}>
              <CheckCircle2 className="w-3 h-3" /> Valid JSON
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: error }}>
              <AlertCircle className="w-3 h-3" /> 0 Errors
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
