import { usePreferenceStore } from '../store/usePreferenceStore';
import { useUIStore, type ThemeModalTab } from '../store/useUIStore';
import type { ThemeDefinition, ThemeTokens, ThemeMode } from './types';

export interface UseThemeReturn {
  /** 'dark' | 'light' mode */
  theme: ThemeMode;
  /** Active theme ID, e.g. 'zerodock-dark', 'tokyo-night', 'dracula' */
  activeThemeId: string;
  /** Complete theme definition */
  activeTheme: ThemeDefinition;
  /** Effective runtime CSS & workbench color tokens */
  tokens: ThemeTokens;
  /** Whether the active theme is in dark mode */
  isDark: boolean;
  /** Quick toggle between dark and light modes */
  toggleTheme: () => void;
  /** Select a specific theme by ID */
  setThemeId: (themeId: string) => void;
  /** Override an individual color token */
  setThemeOverride: (key: keyof ThemeTokens, value: string) => void;
  /** Reset all token customizations back to theme defaults */
  resetThemeOverrides: () => void;
  /** Open the Theme & Workbench Customizer modal */
  openThemeCustomizer: (tab?: ThemeModalTab) => void;
}

/**
 * Standard hook for all ZeroDock website pages and future developer tools.
 *
 * @example
 * ```tsx
 * import { useTheme } from '@/core/theme';
 *
 * export function MyNewTool() {
 *   const { tokens, isDark, openThemeCustomizer } = useTheme();
 *
 *   // Programmatic colors for Canvas / SVG / Charts
 *   const primaryColor = tokens['--zd-primary'];
 *   const surfaceBg = tokens['--zd-surface'];
 *
 *   return (
 *     <div className="bg-[var(--zd-surface)] text-[var(--zd-text-primary)] border border-[var(--zd-border)]">
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  const {
    activeThemeId,
    getActiveTheme,
    getEffectiveTokens,
    toggleTheme,
    setThemeId,
    setThemeOverride,
    resetThemeOverrides,
  } = usePreferenceStore();

  const { setThemeModalOpen } = useUIStore();

  const activeTheme = getActiveTheme();
  const tokens = getEffectiveTokens();

  return {
    theme: activeTheme.mode,
    activeThemeId,
    activeTheme,
    tokens,
    isDark: activeTheme.mode === 'dark',
    toggleTheme,
    setThemeId,
    setThemeOverride,
    resetThemeOverrides,
    openThemeCustomizer: (tab = 'browse') => setThemeModalOpen(true, tab),
  };
}
