import { create } from 'zustand';
import type { HttpMethod, BodyType, KeyValue, ApiRequest, AuthType, AuthConfig, RequestSettings } from '@steq/domain';
import { DEFAULT_REQUEST_SETTINGS } from '@steq/domain';

export interface RequestDraft {
  id: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  bodyType: BodyType;
  bodyContent: string;
  authType: AuthType;
  authConfig: AuthConfig;
  settings: RequestSettings;
  collectionId: string | null;
  folderId: string | null;
  dirty: boolean;
}

export function createEmptyDraft(): RequestDraft {
  return {
    id: null,
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [{ key: '', value: '', enabled: true }],
    queryParams: [{ key: '', value: '', enabled: true }],
    bodyType: 'none',
    bodyContent: '',
    authType: 'none',
    authConfig: { type: 'none' },
    settings: { ...DEFAULT_REQUEST_SETTINGS },
    collectionId: null,
    folderId: null,
    dirty: false,
  };
}

export function requestToDraft(request: ApiRequest): RequestDraft {
  return {
    id: request.id,
    name: request.name,
    method: request.method,
    url: request.url,
    headers:
      request.headers.length > 0
        ? [...request.headers, { key: '', value: '', enabled: true }]
        : [{ key: '', value: '', enabled: true }],
    queryParams:
      request.query_params.length > 0
        ? [...request.query_params, { key: '', value: '', enabled: true }]
        : [{ key: '', value: '', enabled: true }],
    bodyType: request.body_type,
    bodyContent: request.body_content ?? '',
    authType: request.auth_type,
    authConfig: request.auth_config,
    settings: { ...DEFAULT_REQUEST_SETTINGS },
    collectionId: request.collection_id,
    folderId: request.folder_id,
    dirty: false,
  };
}

interface RequestEditorState {
  drafts: Map<string, RequestDraft>;

  getDraft: (tabId: string) => RequestDraft;
  setDraftField: (tabId: string, partial: Partial<RequestDraft>) => void;
  initTab: (tabId: string, draft?: RequestDraft) => void;
  removeTab: (tabId: string) => void;
  loadRequest: (tabId: string, request: ApiRequest) => void;
  markSaved: (tabId: string, id: string, collectionId: string, folderId: string | null) => void;
}

export const useRequestEditorStore = create<RequestEditorState>((set, get) => ({
  drafts: new Map<string, RequestDraft>(),

  getDraft: (tabId) => {
    return get().drafts.get(tabId) ?? createEmptyDraft();
  },

  setDraftField: (tabId, partial) => {
    set((state) => {
      const drafts = new Map(state.drafts);
      const current = drafts.get(tabId) ?? createEmptyDraft();
      drafts.set(tabId, { ...current, ...partial, dirty: true });
      return { drafts };
    });
  },

  initTab: (tabId, draft) => {
    set((state) => {
      const drafts = new Map(state.drafts);
      drafts.set(tabId, draft ?? createEmptyDraft());
      return { drafts };
    });
  },

  removeTab: (tabId) => {
    set((state) => {
      const drafts = new Map(state.drafts);
      drafts.delete(tabId);
      return { drafts };
    });
  },

  loadRequest: (tabId, request) => {
    set((state) => {
      const drafts = new Map(state.drafts);
      drafts.set(tabId, requestToDraft(request));
      return { drafts };
    });
  },

  markSaved: (tabId, id, collectionId, folderId) => {
    set((state) => {
      const drafts = new Map(state.drafts);
      const current = drafts.get(tabId) ?? createEmptyDraft();
      drafts.set(tabId, { ...current, id, collectionId, folderId, dirty: false });
      return { drafts };
    });
  },
}));
