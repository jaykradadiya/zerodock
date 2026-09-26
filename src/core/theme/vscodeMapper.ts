import type { ThemeDefinition, ThemeTokens } from './types';
import { hexToRgba, isDarkColor, isValidHex, normalizeHex } from './colorUtils';

/**
 * Maps VS Code workbench color keys to ZeroDock CSS and editor tokens.
 */
const VSCODE_TO_ZERODOCK_MAP: Record<string, keyof ThemeTokens> = {
  // Canvas / Backgrounds
  'activityBar.background': '--zd-bg',
  'sideBar.background': '--zd-surface',
  'panel.background': '--zd-surface',
  'editorGroupHeader.tabsBackground': '--zd-surface-raised',
  'tab.activeBackground': '--zd-surface',
  'tab.inactiveBackground': '--zd-surface-raised',
  'titleBar.activeBackground': '--zd-nav-bg',
  'statusBar.background': '--zd-surface',

  // Accents / Buttons / Focus
  'button.background': '--zd-primary',
  'focusBorder': '--zd-primary',
  'activityBarBadge.background': '--zd-primary',
  'button.hoverBackground': '--zd-primary-hover',
  'textLink.foreground': '--zd-primary',
  'badge.background': '--zd-accent',
  'progressBar.background': '--zd-accent',

  // Typography / Text
  'foreground': '--zd-text-primary',
  'editor.foreground': '--zd-text-primary',
  'sideBar.foreground': '--zd-text-secondary',
  'descriptionForeground': '--zd-text-muted',

  // Borders
  'sideBar.border': '--zd-border',
  'editorGroup.border': '--zd-border',
  'panel.border': '--zd-border',
  'tab.border': '--zd-border',

  // Status
  'testing.iconPassed': '--zd-success',
  'notificationsInfoIcon.foreground': '--zd-success',
  'errorForeground': '--zd-error',
  'testing.iconFailed': '--zd-error',

  // Direct Monaco Workbench Keys
  'editor.background': 'editor.background',
  'editorLineHighlightBackground': 'editorLineHighlightBackground',
  'editorLineNumber.foreground': 'editorLineNumber.foreground',
  'editorCursor.foreground': 'editorCursor.foreground',
  'editor.selectionBackground': 'editor.selectionBackground',
};

/**
 * Parse an imported JSON string from VS Code or ZeroDock format.
 */
export function parseThemeImport(jsonString: string): {
  theme?: ThemeDefinition;
  overrides?: Partial<ThemeTokens>;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // Case 1: Complete ZeroDock Theme JSON
    if (data && typeof data === 'object' && data.id && data.tokens && data.name) {
      return { theme: data as ThemeDefinition };
    }

    // Case 2: VS Code Theme JSON (e.g. extension theme with colors object)
    const colors = data.colors || (data['workbench.colorCustomizations'] ? data['workbench.colorCustomizations'] : data);

    if (typeof colors === 'object' && colors !== null) {
      const extractedTokens: Partial<ThemeTokens> = {};

      for (const [vsKey, colorVal] of Object.entries(colors)) {
        if (typeof colorVal === 'string' && isValidHex(colorVal)) {
          const targetKey = VSCODE_TO_ZERODOCK_MAP[vsKey];
          if (targetKey) {
            extractedTokens[targetKey] = normalizeHex(colorVal);
          }
        }
      }

      // If we got editor.background, sync to surface if missing
      if (colors['editor.background'] && isValidHex(colors['editor.background'])) {
        const editorBg = normalizeHex(colors['editor.background']);
        extractedTokens['editor.background'] = editorBg;
        if (!extractedTokens['--zd-surface']) {
          extractedTokens['--zd-surface'] = editorBg;
        }
      }

      // Detect dark vs light mode from background
      const baseBg = extractedTokens['--zd-bg'] || extractedTokens['--zd-surface'] || '#121212';
      const mode = isDarkColor(baseBg) ? 'dark' : 'light';

      // Auto-compute soft tokens if primary exists
      if (extractedTokens['--zd-primary']) {
        extractedTokens['--zd-primary-soft'] = hexToRgba(extractedTokens['--zd-primary'], mode === 'dark' ? 0.12 : 0.08);
        extractedTokens['--zd-glow'] = hexToRgba(extractedTokens['--zd-primary'], mode === 'dark' ? 0.15 : 0.12);
        extractedTokens['--zd-border-glow'] = hexToRgba(extractedTokens['--zd-primary'], mode === 'dark' ? 0.35 : 0.25);
      }

      const generatedTheme: ThemeDefinition = {
        id: `custom-imported-${Date.now()}`,
        name: data.name || 'Imported VS Code Theme',
        mode,
        description: 'Imported from VS Code color configuration',
        author: data.author || 'User',
        tokens: {
          '--zd-bg': extractedTokens['--zd-bg'] || (mode === 'dark' ? '#0A0A0A' : '#FFFFFF'),
          '--zd-surface': extractedTokens['--zd-surface'] || (mode === 'dark' ? '#121212' : '#F8F8FA'),
          '--zd-surface-raised': extractedTokens['--zd-surface-raised'] || (mode === 'dark' ? '#1A1A1A' : '#FFFFFF'),
          '--zd-nav-bg': extractedTokens['--zd-nav-bg'] || (mode === 'dark' ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.9)'),
          '--zd-primary': extractedTokens['--zd-primary'] || (mode === 'dark' ? '#8B7CF7' : '#6C5CE7'),
          '--zd-primary-hover': extractedTokens['--zd-primary-hover'] || (mode === 'dark' ? '#9D90F9' : '#5A4BD6'),
          '--zd-primary-soft': extractedTokens['--zd-primary-soft'] || (mode === 'dark' ? 'rgba(139, 124, 247, 0.1)' : 'rgba(108, 92, 231, 0.08)'),
          '--zd-accent': extractedTokens['--zd-accent'] || (mode === 'dark' ? '#F0A030' : '#D4931F'),
          '--zd-accent-soft': (mode === 'dark' ? 'rgba(240, 160, 48, 0.12)' : 'rgba(212, 147, 31, 0.08)'),
          '--zd-text-primary': extractedTokens['--zd-text-primary'] || (mode === 'dark' ? '#F5F5F5' : '#333333'),
          '--zd-text-secondary': extractedTokens['--zd-text-secondary'] || (mode === 'dark' ? '#A3A3A3' : '#666666'),
          '--zd-text-muted': extractedTokens['--zd-text-muted'] || (mode === 'dark' ? '#737373' : '#999999'),
          '--zd-border': extractedTokens['--zd-border'] || (mode === 'dark' ? '#262626' : '#E5E5E5'),
          '--zd-border-hover': extractedTokens['--zd-border-hover'] || (mode === 'dark' ? '#404040' : '#D4D4D4'),
          '--zd-border-glow': extractedTokens['--zd-border-glow'] || 'rgba(139, 124, 247, 0.35)',
          '--zd-glow': extractedTokens['--zd-glow'] || 'rgba(139, 124, 247, 0.15)',
          '--zd-shadow-glow': '0 0 50px rgba(139, 124, 247, 0.2)',
          '--zd-success': extractedTokens['--zd-success'] || (mode === 'dark' ? '#4ADE80' : '#15803D'),
          '--zd-error': extractedTokens['--zd-error'] || (mode === 'dark' ? '#FCA5A5' : '#B42318'),
          'editor.background': extractedTokens['editor.background'] || extractedTokens['--zd-surface'] || (mode === 'dark' ? '#121212' : '#FFFFFF'),
          'editor.foreground': extractedTokens['editor.foreground'] || extractedTokens['--zd-text-primary'] || (mode === 'dark' ? '#F5F5F5' : '#1A1A2E'),
          'editorLineHighlightBackground': extractedTokens['editorLineHighlightBackground'] || (mode === 'dark' ? '#181818' : '#FAFAF8'),
          'editorLineNumber.foreground': extractedTokens['editorLineNumber.foreground'] || (mode === 'dark' ? '#525252' : '#8E8EA0'),
          'editorCursor.foreground': extractedTokens['editorCursor.foreground'] || extractedTokens['--zd-primary'] || (mode === 'dark' ? '#8B7CF7' : '#6C5CE7'),
          'editor.selectionBackground': extractedTokens['editor.selectionBackground'] || 'rgba(139, 124, 247, 0.25)',
        },
      };

      return { theme: generatedTheme };
    }

    return { error: 'Invalid format. Provide a ZeroDock theme JSON or VS Code color customizations object.' };
  } catch (err: any) {
    return { error: err.message || 'Failed to parse JSON string.' };
  }
}

/**
 * Generate VS Code settings.json snippet with workbench.colorCustomizations
 */
export function exportToVsCodeSnippet(tokens: ThemeTokens): string {
  const vsCodeConfig = {
    'workbench.colorCustomizations': {
      'activityBar.background': tokens['--zd-bg'],
      'sideBar.background': tokens['--zd-surface'],
      'panel.background': tokens['--zd-surface'],
      'editorGroupHeader.tabsBackground': tokens['--zd-surface-raised'],
      'tab.activeBackground': tokens['--zd-surface'],
      'tab.inactiveBackground': tokens['--zd-surface-raised'],
      'titleBar.activeBackground': tokens['--zd-nav-bg'],
      'button.background': tokens['--zd-primary'],
      'button.hoverBackground': tokens['--zd-primary-hover'],
      'focusBorder': tokens['--zd-primary'],
      'foreground': tokens['--zd-text-primary'],
      'sideBar.foreground': tokens['--zd-text-secondary'],
      'descriptionForeground': tokens['--zd-text-muted'],
      'sideBar.border': tokens['--zd-border'],
      'panel.border': tokens['--zd-border'],
      'editorGroup.border': tokens['--zd-border'],
      'editor.background': tokens['editor.background'] || tokens['--zd-surface'],
      'editor.foreground': tokens['editor.foreground'] || tokens['--zd-text-primary'],
      'editorLineHighlightBackground': tokens['editorLineHighlightBackground'] || '#181818',
      'editorLineNumber.foreground': tokens['editorLineNumber.foreground'] || tokens['--zd-text-muted'],
      'editorCursor.foreground': tokens['editorCursor.foreground'] || tokens['--zd-primary'],
    },
  };

  return JSON.stringify(vsCodeConfig, null, 2);
}
