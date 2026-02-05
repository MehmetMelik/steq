import { create } from 'zustand';
import type { HttpMethod } from '@reqtor/domain';

export interface TabInfo {
  id: string;
  name: string;
  method: HttpMethod;
  requestId: string | null;
  dirty: boolean;
}

let tabCounter = 0;

function generateTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now()}-${tabCounter}`;
}

interface TabsState {
  tabs: TabInfo[];
  activeTabId: string | null;

  addTab: (tab?: Partial<Omit<TabInfo, 'id'>>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Omit<TabInfo, 'id'>>) => void;
}

export const useTabsStore = create<TabsState>((set, get) => {
  const initialTabId = generateTabId();

  return {
    tabs: [
      {
        id: initialTabId,
        name: 'New Request',
        method: 'GET' as HttpMethod,
        requestId: null,
        dirty: false,
      },
    ],
    activeTabId: initialTabId,

    addTab: (tab) => {
      const id = generateTabId();
      const newTab: TabInfo = {
        id,
        name: tab?.name ?? 'New Request',
        method: tab?.method ?? 'GET',
        requestId: tab?.requestId ?? null,
        dirty: tab?.dirty ?? false,
      };
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: id,
      }));
      return id;
    },

    closeTab: (tabId) => {
      const state = get();
      if (state.tabs.length <= 1) return;

      const index = state.tabs.findIndex((t) => t.id === tabId);
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === tabId) {
        const newIndex = Math.min(index, newTabs.length - 1);
        newActiveId = newTabs[newIndex].id;
      }

      set({ tabs: newTabs, activeTabId: newActiveId });
    },

    setActiveTab: (tabId) => {
      set({ activeTabId: tabId });
    },

    updateTab: (tabId, updates) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
      }));
    },
  };
});
