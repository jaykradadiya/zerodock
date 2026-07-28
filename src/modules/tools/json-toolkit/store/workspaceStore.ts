import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';
import { useUIStore } from '../../../../core/store/useUIStore';

const CLI_SUGGESTIONS = [
  "Use command-line utilities like 'jq' for querying and formatting (e.g., `jq . file.json`).",
  "Use 'prettier' to format JSON locally in your terminal (e.g., `npx prettier --write file.json`).",
  "Close or delete unused tabs in the ZeroDock JSON Formatter workspace to free space."
];

export type FileTab = {
  id: string;
  name: string;
  size: number;
  isModified: boolean;
};

interface WorkspaceState {
  tabs: FileTab[];
  activeTabId: string | null;
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  addTab: (name: string, content: string) => Promise<string>;
  removeTab: (id: string) => Promise<void>;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => Promise<void>;
  renameTab: (id: string, newName: string) => void;
  getFileContent: (id: string) => Promise<string>;
}

export const useWorkspaceStore = create<WorkspaceState>((setStore, getStore) => ({
  tabs: [],
  activeTabId: null,
  isLoading: true,

  initialize: async () => {
    try {
      const storedTabs = await get<FileTab[]>('zd_json_tabs');
      if (storedTabs && storedTabs.length > 0) {
        setStore({ tabs: storedTabs, activeTabId: storedTabs[0].id, isLoading: false });
        return;
      }
    } catch (e) {
      console.error('Failed to init workspace:', e);
    }
    // Fallback: Create default tab if empty or error
    const id = crypto.randomUUID();
    const defaultTab: FileTab = { id, name: 'Untitled 1', size: 0, isModified: false };
    try {
      await set(`zd_file_${id}`, '');
      await set('zd_json_tabs', [defaultTab]);
    } catch (e) {
      console.error('Failed to save default tab to IDB:', e);
    }
    setStore({ tabs: [defaultTab], activeTabId: id, isLoading: false });
  },

  addTab: async (name: string, content: string) => {
    const currentTabs = getStore().tabs;
    const currentTotalSize = currentTabs.reduce((sum, t) => sum + t.size, 0);
    const newSize = content.length;
    
    if (currentTotalSize + newSize > 15 * 1024 * 1024) {
      useUIStore.getState().showStorageWarning(
        "Workspace Storage Limit Exceeded",
        "Adding this tab would exceed the 15MB total workspace storage cap. ZeroDock workspaces run directly inside your browser memory and are optimized for configuration data rather than massive database logs.",
        CLI_SUGGESTIONS
      );
      throw new Error("Workspace size limit exceeded");
    }

    const id = crypto.randomUUID();
    const newTab: FileTab = { id, name, size: newSize, isModified: false };
    
    await set(`zd_file_${id}`, content);
    
    setStore((state) => {
      const newTabs = [...state.tabs, newTab];
      set('zd_json_tabs', newTabs).catch(console.error);
      return { tabs: newTabs, activeTabId: id };
    });
    
    return id;
  },

  removeTab: async (id: string) => {
    await del(`zd_file_${id}`);
    
    setStore((state) => {
      let newTabs = state.tabs.filter(t => t.id !== id);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === id) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }
      
      // If no tabs left, create an empty one synchronously
      if (newTabs.length === 0) {
        const newId = crypto.randomUUID();
        const defaultTab: FileTab = { id: newId, name: 'Untitled 1', size: 0, isModified: false };
        newTabs = [defaultTab];
        newActiveId = newId;
        set(`zd_file_${newId}`, '').catch(console.error);
      }
      
      set('zd_json_tabs', newTabs).catch(console.error);
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  setActiveTab: (id: string) => setStore({ activeTabId: id }),

  updateTabContent: async (id: string, content: string) => {
    const currentTabs = getStore().tabs;
    const oldTab = currentTabs.find(t => t.id === id);
    const oldTabSize = oldTab ? oldTab.size : 0;
    const currentTotalSize = currentTabs.reduce((sum, t) => sum + t.size, 0);
    const newSize = content.length;

    if (currentTotalSize - oldTabSize + newSize > 15 * 1024 * 1024) {
      useUIStore.getState().showStorageWarning(
        "Workspace Storage Limit Exceeded",
        "Updating this file would exceed the 15MB total workspace storage cap. Your latest changes have not been saved to persistent storage.",
        CLI_SUGGESTIONS
      );
      throw new Error("Workspace size limit exceeded");
    }

    await set(`zd_file_${id}`, content);
    
    setStore((state) => {
      const newTabs = state.tabs.map(t => 
        t.id === id ? { ...t, size: newSize, isModified: true } : t
      );
      set('zd_json_tabs', newTabs).catch(console.error);
      return { tabs: newTabs };
    });
  },

  renameTab: (id: string, newName: string) => {
    setStore((state) => {
      const newTabs = state.tabs.map(t => 
        t.id === id ? { ...t, name: newName } : t
      );
      set('zd_json_tabs', newTabs).catch(console.error);
      return { tabs: newTabs };
    });
  },

  getFileContent: async (id: string): Promise<string> => {
    try {
      const content = await get<string>(`zd_file_${id}`);
      return content || '';
    } catch (e) {
      console.error('Failed to get file content:', e);
      return '';
    }
  }
}));
