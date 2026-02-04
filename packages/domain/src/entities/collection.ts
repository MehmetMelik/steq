import type { ApiRequest } from './request';

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  collection_id: string;
  parent_folder_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionTreeNode {
  folder: Folder;
  children: CollectionTreeNode[];
  requests: ApiRequest[];
}

export interface CollectionTree {
  collection: Collection;
  root_folders: CollectionTreeNode[];
  root_requests: ApiRequest[];
}

export interface CreateCollectionInput {
  workspace_id: string;
  name: string;
  description?: string | null;
}

export interface CreateFolderInput {
  collection_id: string;
  parent_folder_id: string | null;
  name: string;
}

export interface RenameInput {
  id: string;
  name: string;
}
