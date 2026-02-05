import { create } from 'zustand';
import type { Collection, CollectionTree } from '@steq/domain';
import { ipc } from '../../../lib/ipc-client';

interface CollectionsState {
  collections: Collection[];
  trees: Record<string, CollectionTree>;
  expandedFolders: Set<string>;
  expandedCollections: Set<string>;
  loading: boolean;

  loadCollections: (workspaceId: string) => Promise<void>;
  loadTree: (collectionId: string) => Promise<void>;
  createCollection: (workspaceId: string, name: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  createFolder: (
    collectionId: string,
    parentFolderId: string | null,
    name: string,
  ) => Promise<void>;
  deleteFolder: (id: string, collectionId: string) => Promise<void>;
  toggleFolder: (folderId: string) => void;
  toggleCollection: (collectionId: string) => void;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  trees: {},
  expandedFolders: new Set<string>(),
  expandedCollections: new Set<string>(),
  loading: false,

  loadCollections: async (workspaceId) => {
    set({ loading: true });
    try {
      const collections = await ipc.collection.list(workspaceId);
      set({ collections, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTree: async (collectionId) => {
    try {
      const tree = await ipc.collection.getTree(collectionId);
      set((state) => ({
        trees: { ...state.trees, [collectionId]: tree },
      }));
    } catch (e) {
      console.error('Failed to load collection tree:', e);
    }
  },

  createCollection: async (workspaceId, name) => {
    const collection = await ipc.collection.create({
      workspace_id: workspaceId,
      name,
    });
    set((state) => ({
      collections: [...state.collections, collection],
      expandedCollections: new Set([...state.expandedCollections, collection.id]),
    }));
    return collection;
  },

  deleteCollection: async (id) => {
    await ipc.collection.delete(id);
    set((state) => {
      const newTrees = { ...state.trees };
      delete newTrees[id];
      return {
        collections: state.collections.filter((c) => c.id !== id),
        trees: newTrees,
      };
    });
  },

  renameCollection: async (id, name) => {
    await ipc.collection.rename({ id, name });
    set((state) => ({
      collections: state.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  createFolder: async (collectionId, parentFolderId, name) => {
    await ipc.folder.create({
      collection_id: collectionId,
      parent_folder_id: parentFolderId,
      name,
    });
    await get().loadTree(collectionId);
  },

  deleteFolder: async (id, collectionId) => {
    await ipc.folder.delete(id);
    await get().loadTree(collectionId);
  },

  toggleFolder: (folderId) => {
    set((state) => {
      const next = new Set(state.expandedFolders);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return { expandedFolders: next };
    });
  },

  toggleCollection: (collectionId) => {
    set((state) => {
      const next = new Set(state.expandedCollections);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return { expandedCollections: next };
    });
    // Load tree if expanding
    if (!get().expandedCollections.has(collectionId)) {
      // It was just toggled on above
    }
    if (get().expandedCollections.has(collectionId) && !get().trees[collectionId]) {
      get().loadTree(collectionId);
    }
  },
}));
