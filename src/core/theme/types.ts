export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  // Canvas & Surfaces
  '--zd-bg': string;
  '--zd-surface': string;
  '--zd-surface-raised': string;
  '--zd-nav-bg': string;

  // Primary Accent & Hover
  '--zd-primary': string;
  '--zd-primary-hover': string;
  '--zd-primary-soft': string;
  '--zd-primary-foreground'?: string;

  // Secondary Accent
  '--zd-accent': string;
  '--zd-accent-soft': string;

  // Text Typography
  '--zd-text-primary': string;
  '--zd-text-secondary': string;
  '--zd-text-muted': string;

  // Borders & Glows
  '--zd-border': string;
  '--zd-border-hover': string;
  '--zd-border-glow': string;
  '--zd-glow': string;
  '--zd-shadow-glow': string;

  // Status Indicators
  '--zd-success': string;
  '--zd-success-soft': string;
  '--zd-error': string;
  '--zd-error-soft': string;
  '--zd-warning': string;
  '--zd-warning-soft': string;
  '--zd-info': string;
  '--zd-info-soft': string;

  // Monaco Editor Workbench Mappings
  'editor.background'?: string;
  'editor.foreground'?: string;
  'editorLineHighlightBackground'?: string;
  'editorLineNumber.foreground'?: string;
  'editorCursor.foreground'?: string;
  'editor.selectionBackground'?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  mode: ThemeMode;
  description: string;
  author?: string;
  isBuiltin?: boolean;
  isHighContrast?: boolean;
  /** Optional companion theme used when switching between light and dark. */
  pairedThemeId?: string;
  tokens: ThemeTokens;
}

export interface TokenCategoryMeta {
  id: string;
  label: string;
  description: string;
  tokens: Array<{
    key: keyof ThemeTokens;
    label: string;
    description: string;
    isColor: boolean;
  }>;
}
