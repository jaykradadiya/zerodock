import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRouter } from './core/router/AppRouter';
import { usePreferenceStore } from './core/store/usePreferenceStore';
import { applyTheme, findThemeById } from './core/theme/themeEngine';

// Apply initial theme tokens and .dark class immediately on mount
const prefState = usePreferenceStore.getState();
const initialTheme = findThemeById(
  prefState.activeThemeId || 'zerodock-dark',
  prefState.customThemes || {}
);
applyTheme(initialTheme, prefState.themeOverrides || {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
