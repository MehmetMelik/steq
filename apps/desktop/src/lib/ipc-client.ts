import { invoke } from '@tauri-apps/api/core';
import type {
  ApiRequest,
  CreateRequestInput,
  UpdateRequestInput,
  ExecuteRequestInput,
  ExecutionResult,
  Workspace,
  Collection,
  CollectionTree,
  CreateCollectionInput,
  CreateFolderInput,
  Folder,
  RenameInput,
  Environment,
  CreateEnvironmentInput,
  UpdateEnvironmentInput,
  HistoryEntry,
  HistoryQuery,
} from '@apiary/domain';

export const ipc = {
  request: {
    create: (input: CreateRequestInput) => invoke<ApiRequest>('create_request', { input }),
    execute: (input: ExecuteRequestInput, workspaceId: string, requestId?: string | null) =>
      invoke<ExecutionResult>('execute_request', {
        input,
        workspaceId,
        requestId: requestId ?? null,
      }),
    update: (input: UpdateRequestInput) => invoke<ApiRequest>('update_request', { input }),
    delete: (id: string) => invoke<void>('delete_request', { id }),
    getById: (id: string) => invoke<ApiRequest | null>('get_request', { id }),
    listByCollection: (collectionId: string) =>
      invoke<ApiRequest[]>('list_requests_by_collection', { collectionId }),
  },
  collection: {
    create: (input: CreateCollectionInput) =>
      invoke<Collection>('create_collection', { input }),
    list: (workspaceId: string) =>
      invoke<Collection[]>('list_collections', { workspaceId }),
    getTree: (id: string) => invoke<CollectionTree>('get_collection_tree', { id }),
    rename: (input: RenameInput) => invoke<void>('rename_collection', { input }),
    delete: (id: string) => invoke<void>('delete_collection', { id }),
  },
  folder: {
    create: (input: CreateFolderInput) => invoke<Folder>('create_folder', { input }),
    rename: (input: RenameInput) => invoke<void>('rename_folder', { input }),
    delete: (id: string) => invoke<void>('delete_folder', { id }),
  },
  environment: {
    create: (input: CreateEnvironmentInput) =>
      invoke<Environment>('create_environment', { input }),
    list: (workspaceId: string) =>
      invoke<Environment[]>('list_environments', { workspaceId }),
    setActive: (id: string, workspaceId: string) =>
      invoke<void>('set_active_environment', { id, workspaceId }),
    deactivateAll: (workspaceId: string) =>
      invoke<void>('deactivate_all_environments', { workspaceId }),
    update: (input: UpdateEnvironmentInput) =>
      invoke<Environment>('update_environment', { input }),
    delete: (id: string) => invoke<void>('delete_environment', { id }),
    getResolvedVariables: (workspaceId: string) =>
      invoke<[string, string][]>('get_resolved_variables', { workspaceId }),
  },
  history: {
    list: (query: HistoryQuery) => invoke<HistoryEntry[]>('list_history', { query }),
    clear: (workspaceId: string) => invoke<void>('clear_history', { workspaceId }),
    delete: (id: string) => invoke<void>('delete_history_entry', { id }),
  },
  io: {
    importPostman: (filePath: string, workspaceId: string) =>
      invoke<{ collection_name: string; request_count: number; folder_count: number }>(
        'import_postman',
        { filePath, workspaceId },
      ),
    exportPostman: (collectionId: string, filePath: string) =>
      invoke<void>('export_postman', { collectionId, filePath }),
  },
  workspace: {
    getCurrent: () => invoke<Workspace>('get_current_workspace'),
  },
};
