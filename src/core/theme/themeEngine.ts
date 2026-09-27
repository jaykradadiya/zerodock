import type { ThemeDefinition, ThemeTokens } from './types';
import { BUILTIN_THEMES } from './presets';
import { monaco } from '../monaco/setup';
import { isDarkColor, isValidHex, toMonacoHex } from './colorUtils';

export const MONACO_THEME_ID = 'zerodock-active';

/**
 * Merge base theme tokens with user overrides to get effective runtime tokens.
 * When high contrast is active, contrast is boosted like GitHub Dark/Light High Contrast.
 */
export function resolveEffectiveTokens(
  theme: ThemeDefinition,
  overrides?: Partial<ThemeTokens>,
  highContrast: boolean = false
): ThemeTokens {
  const merged: ThemeTokens = {
    ...theme.tokens,
    ...(overrides || {}),
  };

  const isHighContrastActive = highContrast || theme.isHighContrast || theme.id.includes('high-contrast');

  if (isHighContrastActive) {
    if (theme.mode === 'dark') {
      // High contrast dark boosts (matching GitHub Dark High Contrast)
      if (!overrides?.['--zd-bg']) merged['--zd-bg'] = '#010409';
      if (!overrides?.['--zd-surface']) merged['--zd-surface'] = '#0A0C10';
      if (!overrides?.['--zd-surface-raised']) merged['--zd-surface-raised'] = '#151B23';
      if (!overrides?.['--zd-border']) merged['--zd-border'] = '#7A828E';
      if (!overrides?.['--zd-border-hover']) merged['--zd-border-hover'] = '#9EA7B3';
      if (!overrides?.['--zd-text-primary']) merged['--zd-text-primary'] = '#FFFFFF';
      if (!overrides?.['--zd-text-secondary']) merged['--zd-text-secondary'] = '#F0F6FC';
      if (!overrides?.['--zd-text-muted']) merged['--zd-text-muted'] = '#8D96A0';
      if (!overrides?.['editor.background']) merged['editor.background'] = '#010409';
      if (!overrides?.['editor.foreground']) merged['editor.foreground'] = '#FFFFFF';
      if (!overrides?.['editorLineNumber.foreground']) merged['editorLineNumber.foreground'] = '#8D96A0';
    } else {
      // High contrast light boosts (matching GitHub Light High Contrast)
      if (!overrides?.['--zd-bg']) merged['--zd-bg'] = '#FFFFFF';
      if (!overrides?.['--zd-surface']) merged['--zd-surface'] = '#FFFFFF';
      if (!overrides?.['--zd-surface-raised']) merged['--zd-surface-raised'] = '#F6F8FA';
      if (!overrides?.['--zd-border']) merged['--zd-border'] = '#24292F';
      if (!overrides?.['--zd-border-hover']) merged['--zd-border-hover'] = '#090D11';
      if (!overrides?.['--zd-text-primary']) merged['--zd-text-primary'] = '#010409';
      if (!overrides?.['--zd-text-secondary']) merged['--zd-text-secondary'] = '#090D11';
      if (!overrides?.['--zd-text-muted']) merged['--zd-text-muted'] = '#484F58';
      if (!overrides?.['editor.background']) merged['editor.background'] = '#FFFFFF';
      if (!overrides?.['editor.foreground']) merged['editor.foreground'] = '#010409';
      if (!overrides?.['editorLineNumber.foreground']) merged['editorLineNumber.foreground'] = '#484F58';
    }
  }

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
  overrides?: Partial<ThemeTokens>,
  highContrast: boolean = false
): void {
  if (typeof document === 'undefined') return;

  const isHighContrastActive = highContrast || theme.isHighContrast || theme.id.includes('high-contrast');
  const tokens = resolveEffectiveTokens(theme, overrides, highContrast);
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

  if (isHighContrastActive) {
    root.setAttribute('data-high-contrast', 'true');
    document.body?.setAttribute('data-high-contrast', 'true');
  } else {
    root.removeAttribute('data-high-contrast');
    document.body?.removeAttribute('data-high-contrast');
  }

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
      // VS Code standard selection colors:
      // Dark+: #264F78 (selection), #3A3D41 (inactive selection), #264F7855 (occurrence highlight)
      // Light+: #ADD6FF (selection), #E4E6F1 (inactive selection), #ADD6FF50 (occurrence highlight)
      const defaultSelectionBg = theme.mode === 'dark' ? '#264F78' : '#ADD6FF';
      const defaultInactiveSelection = theme.mode === 'dark' ? '#3A3D4180' : '#E4E6F180';
      const defaultOccurrenceHighlight = theme.mode === 'dark' ? '#264F7855' : '#ADD6FF50';
      const defaultLineHighlight = theme.mode === 'dark' ? '#1F1F1F' : '#FAFAF8';

      const editorBg = toMonacoHex(tokens['editor.background'] || tokens['--zd-surface'], theme.mode === 'dark' ? '#1E1E1E' : '#FFFFFF');
      const editorFg = toMonacoHex(tokens['editor.foreground'] || tokens['--zd-text-primary'], theme.mode === 'dark' ? '#CCCCCC' : '#333333');
      const lineHighlight = toMonacoHex(tokens['editorLineHighlightBackground'], defaultLineHighlight);
      const lineNum = toMonacoHex(tokens['editorLineNumber.foreground'] || tokens['--zd-text-muted'], theme.mode === 'dark' ? '#5E5E72' : '#8E8EA0');
      const cursor = toMonacoHex(tokens['editorCursor.foreground'] || tokens['--zd-primary'], theme.mode === 'dark' ? '#AEAFAD' : '#000000');
      const selection = toMonacoHex(tokens['editor.selectionBackground'], defaultSelectionBg);

      const monacoBase = isHighContrastActive
        ? (theme.mode === 'dark' ? 'hc-black' : 'hc-light')
        : (theme.mode === 'dark' ? 'vs-dark' : 'vs');

      const successHex = toMonacoHex(tokens['--zd-success'], '#3FB950');
      const errorHex = toMonacoHex(tokens['--zd-error'], '#F85149');

      monaco.editor.defineTheme(MONACO_THEME_ID, {
        base: monacoBase,
        inherit: true,
        rules: [],
        colors: {
          'editor.background': editorBg,
          'editor.foreground': editorFg,
          'editorLineHighlightBackground': lineHighlight,
          'editorLineNumber.foreground': lineNum,
          'editorCursor.foreground': cursor,
          'editor.selectionBackground': selection,
          'editor.inactiveSelectionBackground': defaultInactiveSelection,
          'editor.selectionHighlightBackground': defaultOccurrenceHighlight,
          'editor.findMatchBackground': '#515C6A',
          'editor.findMatchHighlightBackground': '#EA5C0055',
          'editor.wordHighlightBackground': theme.mode === 'dark' ? '#57575740' : '#57575720',
          'editor.wordHighlightStrongBackground': theme.mode === 'dark' ? '#004972B7' : '#0E639C40',
          'editorGutter.background': editorBg,
          'diffEditor.insertedTextBackground': `${successHex.slice(0, 7)}30`,
          'diffEditor.removedTextBackground': `${errorHex.slice(0, 7)}30`,
          'diffEditor.insertedLineBackground': `${successHex.slice(0, 7)}12`,
          'diffEditor.removedLineBackground': `${errorHex.slice(0, 7)}12`,
          'diffEditorOverview.insertedForeground': `${successHex.slice(0, 7)}88`,
          'diffEditorOverview.removedForeground': `${errorHex.slice(0, 7)}88`,
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
