import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';
import { useUIStore } from '../../../../core/store/useUIStore';
import { generateUniqueTabName } from '../../../../shared/utils/nameGenerator';

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

  // Split Editor state
  isSplit: boolean;
  splitDirection: 'horizontal' | 'vertical';
  secondaryTabId: string | null;
  splitRatio: number;
  group1TabIds: string[];
  group2TabIds: string[];
  
  // Actions
  initialize: () => Promise<void>;
  addTab: (name?: string, content?: string, targetGroup?: 1 | 2) => Promise<string>;
  removeTab: (id: string) => Promise<void>;
  closeTabInGroup: (id: string, group: 1 | 2) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => Promise<void>;
  renameTab: (id: string, newName: string) => void;
  getFileContent: (id: string) => Promise<string>;

  // Split actions
  setIsSplit: (split: boolean) => void;
  toggleSplit: () => void;
  setSplitDirection: (direction: 'horizontal' | 'vertical') => void;
  setSecondaryTabId: (id: string | null) => void;
  setSplitRatio: (ratio: number) => void;
  swapPanes: () => void;
  moveTabToGroup: (id: string, toGroup: 1 | 2) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((setStore, getStore) => ({
  tabs: [],
  activeTabId: null,
  isLoading: true,
  isSplit: false,
  splitDirection: 'horizontal',
  secondaryTabId: null,
  splitRatio: 50,
  group1TabIds: [],
  group2TabIds: [],

  initialize: async () => {
    try {
      const storedTabs = await get<FileTab[]>('zd_json_tabs');
      const storedSplit = await get<boolean>('zd_json_is_split');
      const storedSplitDir = await get<'horizontal' | 'vertical'>('zd_json_split_dir');
      const storedSecondaryTab = await get<string>('zd_json_secondary_tab');
      const storedSplitRatio = await get<number>('zd_json_split_ratio');
      const storedGroup1 = await get<string[]>('zd_json_group1_tabs');
      const storedGroup2 = await get<string[]>('zd_json_group2_tabs');

      if (storedTabs && storedTabs.length > 0) {
        const storedActive = await get<string>('zd_json_active_tab');
        const activeTabId =
          storedActive && storedTabs.some((t) => t.id === storedActive)
            ? storedActive
            : storedTabs[0].id;

        const isSplit = storedSplit ?? false;
        let group1TabIds = storedGroup1 ? storedGroup1.filter((id) => storedTabs.some((t) => t.id === id)) : [];
        let group2TabIds = storedGroup2 ? storedGroup2.filter((id) => storedTabs.some((t) => t.id === id)) : [];

        if (group1TabIds.length === 0) {
          if (isSplit && storedTabs.length > 1) {
            group1TabIds = [activeTabId];
            group2TabIds = storedTabs.filter((t) => t.id !== activeTabId).map((t) => t.id);
          } else {
            group1TabIds = storedTabs.map((t) => t.id);
            group2TabIds = isSplit ? [activeTabId] : [];
          }
        }

        const secondaryTabId = storedSecondaryTab && storedTabs.some((t) => t.id === storedSecondaryTab)
          ? storedSecondaryTab
          : (group2TabIds.length > 0 ? group2TabIds[0] : activeTabId);

        setStore({
          tabs: storedTabs,
          activeTabId,
          isSplit,
          splitDirection: storedSplitDir ?? 'horizontal',
          secondaryTabId,
          splitRatio: storedSplitRatio ?? 50,
          group1TabIds,
          group2TabIds,
          isLoading: false
        });
        return;
      }
    } catch (e) {
      console.error('Failed to init workspace:', e);
    }
    // Fallback: Create default tab if empty or error
    const id = crypto.randomUUID();
    const defaultTab: FileTab = { id, name: generateUniqueTabName([], '.json'), size: 0, isModified: false };
    try {
      await set(`zd_file_${id}`, '');
      await set('zd_json_tabs', [defaultTab]);
      await set('zd_json_active_tab', id);
    } catch (e) {
      console.error('Failed to save default tab to IDB:', e);
    }
    setStore({
      tabs: [defaultTab],
      activeTabId: id,
      isSplit: false,
      splitDirection: 'horizontal',
      secondaryTabId: id,
      splitRatio: 50,
      group1TabIds: [id],
      group2TabIds: [],
      isLoading: false
    });
  },

  addTab: async (name?: string, content: string = '', targetGroup?: 1 | 2) => {
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

    const existingNames = currentTabs.map((t) => t.name);
    const tabName = name?.trim() ? name.trim() : generateUniqueTabName(existingNames, '.json');

    const id = crypto.randomUUID();
    const newTab: FileTab = { id, name: tabName, size: newSize, isModified: false };
    
    await set(`zd_file_${id}`, content);
    
    setStore((state) => {
      const newTabs = [...state.tabs, newTab];
      const isTarget2 = targetGroup === 2 && state.isSplit;
      const newGroup1 = isTarget2 ? state.group1TabIds : [...state.group1TabIds, id];
      const newGroup2 = isTarget2 ? [...state.group2TabIds, id] : state.group2TabIds;

      set('zd_json_tabs', newTabs).catch(console.error);
      if (isTarget2) {
        set('zd_json_secondary_tab', id).catch(console.error);
      } else {
        set('zd_json_active_tab', id).catch(console.error);
      }
      set('zd_json_group1_tabs', newGroup1).catch(console.error);
      set('zd_json_group2_tabs', newGroup2).catch(console.error);

      return {
        tabs: newTabs,
        activeTabId: isTarget2 ? state.activeTabId : id,
        secondaryTabId: isTarget2 ? id : state.secondaryTabId,
        group1TabIds: newGroup1,
        group2TabIds: newGroup2,
      };
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
        const defaultTab: FileTab = { id: newId, name: generateUniqueTabName([], '.json'), size: 0, isModified: false };
        newTabs = [defaultTab];
        newActiveId = newId;
        set(`zd_file_${newId}`, '').catch(console.error);
      }

      let newGroup1 = state.group1TabIds.filter((t) => t !== id);
      let newGroup2 = state.group2TabIds.filter((t) => t !== id);
      if (newGroup1.length === 0 && newActiveId) {
        newGroup1 = [newActiveId];
      }

      let newSecondaryId = state.secondaryTabId;
      if (state.secondaryTabId === id) {
        newSecondaryId = newGroup2.length > 0 ? newGroup2[newGroup2.length - 1] : newActiveId;
      }
      
      set('zd_json_tabs', newTabs).catch(console.error);
      if (newActiveId) set('zd_json_active_tab', newActiveId).catch(console.error);
      if (newSecondaryId) set('zd_json_secondary_tab', newSecondaryId).catch(console.error);
      set('zd_json_group1_tabs', newGroup1).catch(console.error);
      set('zd_json_group2_tabs', newGroup2).catch(console.error);

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
        secondaryTabId: newSecondaryId,
        group1TabIds: newGroup1,
        group2TabIds: newGroup2,
      };
    });
  },

  closeTabInGroup: (id: string, group: 1 | 2) => {
    const state = getStore();
    if (group === 2) {
      const isAlsoInGroup1 = state.group1TabIds.includes(id);
      const newGroup2 = state.group2TabIds.filter((t) => t !== id);
      if (newGroup2.length === 0) {
        // Group 2 is now empty: close split mode like VS Code!
        const nextGroup1 = isAlsoInGroup1
          ? state.group1TabIds
          : (state.group1TabIds.length > 0 ? state.group1TabIds : [id]);
        let newTabs = state.tabs;
        if (!isAlsoInGroup1 && state.group1TabIds.length > 0) {
          newTabs = state.tabs.filter((t) => t.id !== id);
          del(`zd_file_${id}`).catch(console.error);
        }
        setStore({
          isSplit: false,
          group2TabIds: [],
          secondaryTabId: null,
          group1TabIds: nextGroup1,
          tabs: newTabs,
        });
        set('zd_json_is_split', false).catch(console.error);
        set('zd_json_group2_tabs', []).catch(console.error);
        set('zd_json_group1_tabs', nextGroup1).catch(console.error);
        set('zd_json_tabs', newTabs).catch(console.error);
      } else {
        const newSec = state.secondaryTabId === id ? newGroup2[newGroup2.length - 1] : state.secondaryTabId;
        let newTabs = state.tabs;
        if (!isAlsoInGroup1) {
          newTabs = state.tabs.filter((t) => t.id !== id);
          del(`zd_file_${id}`).catch(console.error);
          set('zd_json_tabs', newTabs).catch(console.error);
        }
        setStore({
          tabs: newTabs,
          group2TabIds: newGroup2,
          secondaryTabId: newSec,
        });
        if (newSec) set('zd_json_secondary_tab', newSec).catch(console.error);
        set('zd_json_group2_tabs', newGroup2).catch(console.error);
      }
    } else {
      // Group 1
      const isAlsoInGroup2 = state.group2TabIds.includes(id);
      const newGroup1 = state.group1TabIds.filter((t) => t !== id);
      if (newGroup1.length === 0) {
        if (state.group2TabIds.length > 0) {
          const [moved, ...restGroup2] = state.group2TabIds;
          let newTabs = state.tabs;
          if (!isAlsoInGroup2 && id !== moved) {
            newTabs = state.tabs.filter((t) => t.id !== id);
            del(`zd_file_${id}`).catch(console.error);
            set('zd_json_tabs', newTabs).catch(console.error);
          }
          const nextSplit = restGroup2.length > 0;
          setStore({
            tabs: newTabs,
            group1TabIds: [moved],
            activeTabId: moved,
            group2TabIds: restGroup2,
            secondaryTabId: restGroup2.length > 0 ? restGroup2[0] : null,
            isSplit: nextSplit,
          });
          set('zd_json_group1_tabs', [moved]).catch(console.error);
          set('zd_json_group2_tabs', restGroup2).catch(console.error);
          set('zd_json_active_tab', moved).catch(console.error);
          set('zd_json_is_split', nextSplit).catch(console.error);
        } else {
          void getStore().removeTab(id);
        }
      } else {
        const newActive = state.activeTabId === id ? newGroup1[newGroup1.length - 1] : state.activeTabId;
        let newTabs = state.tabs;
        if (!isAlsoInGroup2) {
          newTabs = state.tabs.filter((t) => t.id !== id);
          del(`zd_file_${id}`).catch(console.error);
          set('zd_json_tabs', newTabs).catch(console.error);
        }
        setStore({
          tabs: newTabs,
          group1TabIds: newGroup1,
          activeTabId: newActive,
        });
        if (newActive) set('zd_json_active_tab', newActive).catch(console.error);
        set('zd_json_group1_tabs', newGroup1).catch(console.error);
      }
    }
  },

  setActiveTab: (id: string) => {
    setStore((state) => {
      const group1 = state.group1TabIds.includes(id) ? state.group1TabIds : [...state.group1TabIds, id];
      set('zd_json_active_tab', id).catch(console.error);
      set('zd_json_group1_tabs', group1).catch(console.error);
      return { activeTabId: id, group1TabIds: group1 };
    });
  },

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
  },

  setIsSplit: (split: boolean) => {
    const state = getStore();
    if (split === state.isSplit) return;
    getStore().toggleSplit();
  },

  toggleSplit: () => {
    const state = getStore();
    const nextSplit = !state.isSplit;
    let group1 = [...state.group1TabIds];
    let group2 = [...state.group2TabIds];
    let secondary = state.secondaryTabId;

    if (nextSplit) {
      if (group2.length === 0) {
        if (state.tabs.length > 1) {
          const currentActive = state.activeTabId || state.tabs[0].id;
          group1 = [currentActive];
          group2 = state.tabs.filter((t) => t.id !== currentActive).map((t) => t.id);
          secondary = group2[0];
        } else if (state.tabs.length === 1) {
          group1 = [state.tabs[0].id];
          group2 = [state.tabs[0].id];
          secondary = state.tabs[0].id;
        }
      } else if (!secondary || !state.tabs.some(t => t.id === secondary)) {
        secondary = group2[0];
      }
    } else {
      group1 = Array.from(new Set([...group1, ...group2]));
      group2 = [];
      secondary = null;
    }

    setStore({
      isSplit: nextSplit,
      secondaryTabId: secondary,
      group1TabIds: group1,
      group2TabIds: group2,
    });
    set('zd_json_is_split', nextSplit).catch(console.error);
    if (secondary) set('zd_json_secondary_tab', secondary).catch(console.error);
    set('zd_json_group1_tabs', group1).catch(console.error);
    set('zd_json_group2_tabs', group2).catch(console.error);
  },

  setSplitDirection: (direction: 'horizontal' | 'vertical') => {
    setStore({ splitDirection: direction });
    set('zd_json_split_dir', direction).catch(console.error);
  },

  setSecondaryTabId: (id: string | null) => {
    setStore((state) => {
      if (!id) return { secondaryTabId: null };
      const group2 = state.group2TabIds.includes(id) ? state.group2TabIds : [...state.group2TabIds, id];
      set('zd_json_secondary_tab', id).catch(console.error);
      set('zd_json_group2_tabs', group2).catch(console.error);
      return { secondaryTabId: id, group2TabIds: group2 };
    });
  },

  setSplitRatio: (ratio: number) => {
    const clamped = Math.min(85, Math.max(15, ratio));
    setStore({ splitRatio: clamped });
    set('zd_json_split_ratio', clamped).catch(console.error);
  },

  swapPanes: () => {
    const state = getStore();
    setStore({
      activeTabId: state.secondaryTabId,
      secondaryTabId: state.activeTabId,
      group1TabIds: state.group2TabIds,
      group2TabIds: state.group1TabIds,
    });
    if (state.secondaryTabId) set('zd_json_active_tab', state.secondaryTabId).catch(console.error);
    if (state.activeTabId) set('zd_json_secondary_tab', state.activeTabId).catch(console.error);
    set('zd_json_group1_tabs', state.group2TabIds).catch(console.error);
    set('zd_json_group2_tabs', state.group1TabIds).catch(console.error);
  },

  moveTabToGroup: (id: string, toGroup: 1 | 2) => {
    const state = getStore();
    if (toGroup === 2) {
      if (state.group1TabIds.length <= 1) {
        const newGroup2 = Array.from(new Set([...state.group2TabIds, id]));
        setStore({ group2TabIds: newGroup2, secondaryTabId: id });
        set('zd_json_group2_tabs', newGroup2).catch(console.error);
        set('zd_json_secondary_tab', id).catch(console.error);
        return;
      }
      const newGroup1 = state.group1TabIds.filter((t) => t !== id);
      const newGroup2 = Array.from(new Set([...state.group2TabIds, id]));
      const newActive = state.activeTabId === id ? newGroup1[newGroup1.length - 1] : state.activeTabId;
      setStore({
        group1TabIds: newGroup1,
        activeTabId: newActive,
        group2TabIds: newGroup2,
        secondaryTabId: id,
      });
      set('zd_json_group1_tabs', newGroup1).catch(console.error);
      set('zd_json_group2_tabs', newGroup2).catch(console.error);
      if (newActive) set('zd_json_active_tab', newActive).catch(console.error);
      set('zd_json_secondary_tab', id).catch(console.error);
    } else {
      if (state.group2TabIds.length <= 1) {
        const newGroup1 = Array.from(new Set([...state.group1TabIds, id]));
        setStore({ group1TabIds: newGroup1, activeTabId: id });
        set('zd_json_group1_tabs', newGroup1).catch(console.error);
        set('zd_json_active_tab', id).catch(console.error);
        return;
      }
      const newGroup2 = state.group2TabIds.filter((t) => t !== id);
      const newGroup1 = Array.from(new Set([...state.group1TabIds, id]));
      const newSec = state.secondaryTabId === id ? newGroup2[newGroup2.length - 1] : state.secondaryTabId;
      setStore({
        group2TabIds: newGroup2,
        secondaryTabId: newSec,
        group1TabIds: newGroup1,
        activeTabId: id,
      });
      set('zd_json_group1_tabs', newGroup1).catch(console.error);
      set('zd_json_group2_tabs', newGroup2).catch(console.error);
      if (newSec) set('zd_json_secondary_tab', newSec).catch(console.error);
      set('zd_json_active_tab', id).catch(console.error);
    }
  }
}));
