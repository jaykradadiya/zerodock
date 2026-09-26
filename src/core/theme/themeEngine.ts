import type { ThemeDefinition, ThemeTokens } from './types';
import { BUILTIN_THEMES } from './presets';
import { monaco } from '../monaco/setup';
import { isDarkColor, isValidHex } from './colorUtils';

export const MONACO_THEME_ID = 'zerodock-active';

/**
 * Merge base theme tokens with user overrides to get effective runtime tokens.
 */
export function resolveEffectiveTokens(
  theme: ThemeDefinition,
  overrides?: Partial<ThemeTokens>
): ThemeTokens {
  const merged: ThemeTokens = {
    ...theme.tokens,
    ...(overrides || {}),
  };

  if (!merged['--zd-primary-foreground']) {
    const primary = merged['--zd-primary'];
    merged['--zd-primary-foreground'] =
      primary && isValidHex(primary) && !isDarkColor(primary) ? '#0A0A0A' : '#FFFFFF';
  }

  return merged;
}

/**
 * Applies a theme to the DOM (HTML root element CSS variables and class)
 * and synchronizes Monaco editor themes instantaneously.
 */
export function applyTheme(
  theme: ThemeDefinition,
  overrides?: Partial<ThemeTokens>
): void {
  if (typeof document === 'undefined') return;

  const tokens = resolveEffectiveTokens(theme, overrides);
  const root = document.documentElement;

  // Toggle .dark class on html and body
  if (theme.mode === 'dark') {
    root.classList.add('dark');
    document.body?.classList.add('dark');
  } else {
    root.classList.remove('dark');
    document.body?.classList.remove('dark');
  }

  root.setAttribute('data-theme', theme.id);

  // Set CSS custom properties on documentElement and body inline styles
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('--zd-') && typeof value === 'string') {
      root.style.setProperty(key, value, 'important');
      if (document.body) {
        document.body.style.setProperty(key, value, 'important');
      }
    }
  }

  // Inject dynamic <style id="zerodock-active-theme"> tag
  // This guarantees tokens override any hardcoded .dark or :root blocks across the entire page
  let styleEl = document.getElementById('zerodock-active-theme') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'zerodock-active-theme';
    document.head.appendChild(styleEl);
  }

  const tokenDeclarations = Object.entries(tokens)
    .filter(([key]) => key.startsWith('--zd-') && typeof tokens[key as keyof ThemeTokens] === 'string')
    .map(([key, value]) => `    ${key}: ${value} !important;`)
    .join('\n');

  styleEl.textContent = `
    :root,
    :root.dark,
    html,
    html.dark,
    body,
    body.dark,
    #root,
    .dark,
    [data-theme] {
${tokenDeclarations}
    }
  `;

  // Synchronize Monaco Editor theme dynamically
  try {
    if (monaco && monaco.editor) {
      const editorBg = tokens['editor.background'] || tokens['--zd-surface'];
      const editorFg = tokens['editor.foreground'] || tokens['--zd-text-primary'];
      const lineHighlight =
        tokens['editorLineHighlightBackground'] ||
        (theme.mode === 'dark' ? '#181818' : '#FAFAF8');
      const lineNum =
        tokens['editorLineNumber.foreground'] || tokens['--zd-text-muted'];
      const cursor = tokens['editorCursor.foreground'] || tokens['--zd-primary'];
      const selection =
        tokens['editor.selectionBackground'] || tokens['--zd-primary-soft'];

      monaco.editor.defineTheme(MONACO_THEME_ID, {
        base: theme.mode === 'dark' ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': editorBg,
          'editor.foreground': editorFg,
          'editorLineHighlightBackground': lineHighlight,
          'editorLineNumber.foreground': lineNum,
          'editorCursor.foreground': cursor,
          'editor.selectionBackground': selection,
          'editorGutter.background': editorBg,
          'diffEditor.insertedTextBackground': `${tokens['--zd-success']}30`,
          'diffEditor.removedTextBackground': `${tokens['--zd-error']}30`,
          'diffEditor.insertedLineBackground': `${tokens['--zd-success']}12`,
          'diffEditor.removedLineBackground': `${tokens['--zd-error']}12`,
          'diffEditorOverview.insertedForeground': `${tokens['--zd-success']}88`,
          'diffEditorOverview.removedForeground': `${tokens['--zd-error']}88`,
        },
      });

      monaco.editor.setTheme(MONACO_THEME_ID);
    }
  } catch (err) {
    // Monaco might initialize asynchronously; errors safely swallowed
    console.debug('Monaco theme update deferred:', err);
  }
}

/**
 * Return all available themes (built-in + user custom themes)
 */
export function getAllThemes(
  customThemes: Record<string, ThemeDefinition> = {}
): ThemeDefinition[] {
  const customList = Object.values(customThemes);
  return [...BUILTIN_THEMES, ...customList];
}

/**
 * Find a theme by its ID
 */
export function findThemeById(
  id: string,
  customThemes: Record<string, ThemeDefinition> = {}
): ThemeDefinition {
  const all = getAllThemes(customThemes);
  const found = all.find((t) => t.id === id);
  return found || BUILTIN_THEMES[0];
}
