import { create } from 'zustand';
import type { HistoryEntry } from '@steq/domain';
import { ipc } from '../../../lib/ipc-client';

interface HistoryState {
  entries: HistoryEntry[];
  loading: boolean;

  loadHistory: (workspaceId: string) => Promise<void>;
  clearHistory: (workspaceId: string) => Promise<void>;
  deleteEntry: (id: string, workspaceId: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  loading: false,

  loadHistory: async (workspaceId) => {
    set({ loading: true });
    const entries = await ipc.history.list({
      workspace_id: workspaceId,
      limit: 100,
      offset: 0,
    });
    set({ entries, loading: false });
  },

  clearHistory: async (workspaceId) => {
    await ipc.history.clear(workspaceId);
    set({ entries: [] });
  },

  deleteEntry: async (id, workspaceId) => {
    await ipc.history.delete(id);
    await get().loadHistory(workspaceId);
  },
}));
