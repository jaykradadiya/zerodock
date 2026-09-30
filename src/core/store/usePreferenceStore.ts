import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import type { ThemeDefinition, ThemeTokens } from '../theme/types';
import { applyTheme, findThemeById, resolveEffectiveTokens } from '../theme/themeEngine';
import { BUILTIN_THEMES } from '../theme/presets';

interface PreferenceState {
  theme: 'light' | 'dark';
  activeThemeId: string;
  customThemes: Record<string, ThemeDefinition>;
  themeOverrides: Partial<ThemeTokens>;
  highContrast: boolean;
  viewMode: 'grid' | 'list';
  soundEnabled: boolean;
  recentTools: string[];
  favoriteTools: string[];
  dismissedTips: string[];
  tipsHidden: boolean;

  // Actions
  toggleTheme: () => void;
  setThemeId: (themeId: string) => void;
  setThemeOverride: (key: keyof ThemeTokens, value: string) => void;
  resetThemeOverrides: () => void;
  toggleHighContrast: () => void;
  setHighContrast: (enabled: boolean) => void;
  saveCustomTheme: (theme: ThemeDefinition) => void;
  deleteCustomTheme: (themeId: string) => void;
  getActiveTheme: () => ThemeDefinition;
  getEffectiveTokens: () => ThemeTokens;

  toggleSound: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  addRecentTool: (toolId: string) => void;
  toggleFavoriteTool: (toolId: string) => void;
  dismissTip: (tipId: string) => void;
  hideAllTips: () => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      activeThemeId: 'linear-dark',
      customThemes: {},
      themeOverrides: {},
      highContrast: false,
      viewMode: 'grid',
      soundEnabled: true,
      recentTools: [],
      favoriteTools: [],
      dismissedTips: [],
      tipsHidden: false,

      getActiveTheme: () => {
        const { activeThemeId, customThemes } = get();
        return findThemeById(activeThemeId, customThemes);
      },

      getEffectiveTokens: () => {
        const theme = get().getActiveTheme();
        return resolveEffectiveTokens(theme, get().themeOverrides, get().highContrast);
      },

      toggleTheme: () =>
        set((state) => {
          const currentTheme = findThemeById(state.activeThemeId, state.customThemes);
          const nextMode: 'light' | 'dark' = currentTheme.mode === 'dark' ? 'light' : 'dark';
          const nextThemeId = state.highContrast
            ? (nextMode === 'light' ? 'github-light-high-contrast' : 'github-dark-high-contrast')
            : (nextMode === 'light' ? 'geist-mono' : 'linear-dark');
          const nextTheme = findThemeById(nextThemeId, state.customThemes);

          applyTheme(nextTheme, {}, state.highContrast);
          return {
            theme: nextMode,
            activeThemeId: nextThemeId,
            themeOverrides: {},
          };
        }),

      setThemeId: (themeId: string) =>
        set((state) => {
          const targetTheme = findThemeById(themeId, state.customThemes);
          const isHighContrast = Boolean(targetTheme.isHighContrast || state.highContrast);
          applyTheme(targetTheme, {}, isHighContrast);
          return {
            activeThemeId: themeId,
            theme: targetTheme.mode,
            highContrast: targetTheme.isHighContrast ? true : state.highContrast,
            themeOverrides: {},
          };
        }),

      setThemeOverride: (key: keyof ThemeTokens, value: string) =>
        set((state) => {
          const newOverrides = {
            ...state.themeOverrides,
            [key]: value,
          };
          const targetTheme = findThemeById(state.activeThemeId, state.customThemes);
          applyTheme(targetTheme, newOverrides, state.highContrast);
          return {
            themeOverrides: newOverrides,
          };
        }),

      resetThemeOverrides: () =>
        set((state) => {
          const targetTheme = findThemeById(state.activeThemeId, state.customThemes);
          applyTheme(targetTheme, {}, state.highContrast);
          return {
            themeOverrides: {},
          };
        }),

      toggleHighContrast: () =>
        set((state) => {
          const next = !state.highContrast;
          const targetTheme = findThemeById(state.activeThemeId, state.customThemes);
          applyTheme(targetTheme, state.themeOverrides, next);
          return { highContrast: next };
        }),

      setHighContrast: (enabled: boolean) =>
        set((state) => {
          const targetTheme = findThemeById(state.activeThemeId, state.customThemes);
          applyTheme(targetTheme, state.themeOverrides, enabled);
          return { highContrast: enabled };
        }),

      saveCustomTheme: (customTheme: ThemeDefinition) =>
        set((state) => {
          const updatedCustomThemes = {
            ...state.customThemes,
            [customTheme.id]: customTheme,
          };
          applyTheme(customTheme, {}, state.highContrast);
          return {
            customThemes: updatedCustomThemes,
            activeThemeId: customTheme.id,
            theme: customTheme.mode,
            themeOverrides: {},
          };
        }),

      deleteCustomTheme: (themeId: string) =>
        set((state) => {
          const updated = { ...state.customThemes };
          delete updated[themeId];
          const fallbackId = 'linear-dark';
          const fallbackTheme = BUILTIN_THEMES[0];
          if (state.activeThemeId === themeId) {
            applyTheme(fallbackTheme, {}, state.highContrast);
            return {
              customThemes: updated,
              activeThemeId: fallbackId,
              theme: fallbackTheme.mode,
              themeOverrides: {},
            };
          }
          return { customThemes: updated };
        }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setViewMode: (mode) => set({ viewMode: mode }),
      addRecentTool: (toolId) =>
        set((state) => {
          const filtered = state.recentTools.filter((id) => id !== toolId);
          return { recentTools: [toolId, ...filtered].slice(0, 10) };
        }),
      toggleFavoriteTool: (toolId) =>
        set((state) => {
          const isFavorite = state.favoriteTools.includes(toolId);
          return {
            favoriteTools: isFavorite
              ? state.favoriteTools.filter((id) => id !== toolId)
              : [...state.favoriteTools, toolId],
          };
        }),
      dismissTip: (tipId) =>
        set((state) => ({
          dismissedTips: state.dismissedTips.includes(tipId)
            ? state.dismissedTips
            : [...state.dismissedTips, tipId],
        })),
      hideAllTips: () =>
        set(() => ({ tipsHidden: true })),
    }),
    {
      name: 'zerodock-preferences',
      storage: createJSONStorage(() => idbStorage),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0 && persistedState && typeof persistedState === 'object') {
          const state = persistedState as Record<string, unknown>;
          if (state.activeThemeId === 'zerodock-dark') {
            state.activeThemeId = 'linear-dark';
          } else if (state.activeThemeId === 'zerodock-light') {
            state.activeThemeId = 'geist-mono';
          }
        }
        return persistedState as PreferenceState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const active = findThemeById(state.activeThemeId || 'linear-dark', state.customThemes || {});
          applyTheme(active, state.themeOverrides || {}, state.highContrast || false);
        }
      },
    }
  )
);
