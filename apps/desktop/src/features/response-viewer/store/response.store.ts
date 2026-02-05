import { create } from 'zustand';
import type { ExecutionResult } from '@reqtor/domain';

interface TabResponse {
  result: ExecutionResult | null;
  loading: boolean;
}

interface ResponseState {
  responses: Map<string, TabResponse>;

  getResponse: (tabId: string) => TabResponse;
  setResult: (tabId: string, result: ExecutionResult | null) => void;
  setLoading: (tabId: string, loading: boolean) => void;
  clearTab: (tabId: string) => void;
  removeTab: (tabId: string) => void;
}

const emptyResponse: TabResponse = { result: null, loading: false };

export const useResponseStore = create<ResponseState>((set, get) => ({
  responses: new Map<string, TabResponse>(),

  getResponse: (tabId) => {
    return get().responses.get(tabId) ?? emptyResponse;
  },

  setResult: (tabId, result) => {
    set((state) => {
      const responses = new Map(state.responses);
      responses.set(tabId, { result, loading: false });
      return { responses };
    });
  },

  setLoading: (tabId, loading) => {
    set((state) => {
      const responses = new Map(state.responses);
      const current = responses.get(tabId) ?? emptyResponse;
      responses.set(tabId, { ...current, loading });
      return { responses };
    });
  },

  clearTab: (tabId) => {
    set((state) => {
      const responses = new Map(state.responses);
      responses.set(tabId, { result: null, loading: false });
      return { responses };
    });
  },

  removeTab: (tabId) => {
    set((state) => {
      const responses = new Map(state.responses);
      responses.delete(tabId);
      return { responses };
    });
  },
}));
