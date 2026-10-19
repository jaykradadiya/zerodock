import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './core/router/AppRouter';
import { usePreferenceStore } from './core/store/usePreferenceStore';
import { applyTheme, findThemeById } from './core/theme/themeEngine';

// Apply initial theme tokens and .dark class immediately on mount
const prefState = usePreferenceStore.getState();
const initialTheme = findThemeById(
  prefState.activeThemeId || 'warm-paper',
  prefState.customThemes || {}
);
applyTheme(initialTheme, prefState.themeOverrides || {}, prefState.highContrast || false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
