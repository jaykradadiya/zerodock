import { create } from 'zustand';

import type { ToolShortcutHandlers } from '../../shared/hooks/useToolShortcuts';

export interface ContextCommand {
  id: string;
  name: string;
  description?: string;
  icon?: any;
  action: () => void;
}

export type ThemeModalTab = 'browse' | 'customize' | 'vscode';

interface UIState {
  commandPaletteOpen: boolean;
  zenMode: boolean;
  toolActions: ToolShortcutHandlers;
  contextCommands: ContextCommand[];
  storageWarning: {
    isOpen: boolean;
    title: string;
    message: string;
    suggestions: string[];
  } | null;
  themeModalOpen: boolean;
  themeModalTab: ThemeModalTab;
  setThemeModalOpen: (open: boolean, tab?: ThemeModalTab) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setZenMode: (open: boolean) => void;
  setToolActions: (actions: ToolShortcutHandlers) => void;
  setContextCommands: (commands: ContextCommand[]) => void;
  showStorageWarning: (title: string, message: string, suggestions?: string[]) => void;
  closeStorageWarning: () => void;
  feedbackModalOpen: boolean;
  feedbackModalCategory?: import('../../shared/types/feedback').FeedbackCategory;
  setFeedbackModalOpen: (open: boolean, category?: import('../../shared/types/feedback').FeedbackCategory) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  zenMode: false,
  toolActions: {},
  contextCommands: [],
  storageWarning: null,
  shortcutsOpen: false,
  themeModalOpen: false,
  themeModalTab: 'browse',
  feedbackModalOpen: false,
  feedbackModalCategory: 'feature',
  setFeedbackModalOpen: (feedbackModalOpen, category) =>
    set((state) => ({
      feedbackModalOpen,
      feedbackModalCategory: category !== undefined ? category : (feedbackModalOpen ? state.feedbackModalCategory || 'feature' : state.feedbackModalCategory),
    })),
  setThemeModalOpen: (themeModalOpen, tab) =>
    set((state) => ({
      themeModalOpen,
      themeModalTab: tab !== undefined ? tab : state.themeModalTab,
    })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setZenMode: (zenMode) => set({ zenMode }),
  setToolActions: (toolActions) => set({ toolActions }),
  setContextCommands: (contextCommands) => set({ contextCommands }),
  showStorageWarning: (title, message, suggestions = []) =>
    set({
      storageWarning: { isOpen: true, title, message, suggestions },
    }),
  closeStorageWarning: () => set({ storageWarning: null }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
