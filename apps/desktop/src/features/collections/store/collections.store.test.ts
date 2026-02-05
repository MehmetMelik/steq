import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Collection, CollectionTree } from '@reqtor/domain';

vi.mock('../../../lib/ipc-client', () => ({
  ipc: {
    collection: {
      list: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      getTree: vi.fn(),
    },
    folder: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { useCollectionsStore } from './collections.store';
import { ipc } from '../../../lib/ipc-client';

const mockedIpc = vi.mocked(ipc, true);

const mockCollection: Collection = {
  id: 'coll-1',
  workspace_id: 'ws-1',
  name: 'Test Collection',
  description: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockTree: CollectionTree = {
  collection: mockCollection,
  root_folders: [],
  root_requests: [],
};

describe('collections.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCollectionsStore.setState({
      collections: [],
      trees: {},
      expandedFolders: new Set(),
      expandedCollections: new Set(),
      loading: false,
    });
  });

  it('loadCollections fetches and stores collections', async () => {
    mockedIpc.collection.list.mockResolvedValue([mockCollection]);

    await useCollectionsStore.getState().loadCollections('ws-1');

    const state = useCollectionsStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].name).toBe('Test Collection');
    expect(state.loading).toBe(false);
    expect(mockedIpc.collection.list).toHaveBeenCalledWith('ws-1');
  });

  it('createCollection adds to state and expands', async () => {
    mockedIpc.collection.create.mockResolvedValue(mockCollection);

    const result = await useCollectionsStore.getState().createCollection('ws-1', 'Test Collection');

    expect(result.id).toBe('coll-1');
    const state = useCollectionsStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.expandedCollections.has('coll-1')).toBe(true);
  });

  it('deleteCollection removes and cleans up tree', async () => {
    useCollectionsStore.setState({
      collections: [mockCollection],
      trees: { 'coll-1': mockTree },
    });
    mockedIpc.collection.delete.mockResolvedValue(undefined);

    await useCollectionsStore.getState().deleteCollection('coll-1');

    const state = useCollectionsStore.getState();
    expect(state.collections).toHaveLength(0);
    expect(state.trees['coll-1']).toBeUndefined();
  });

  it('renameCollection updates name in state', async () => {
    useCollectionsStore.setState({ collections: [mockCollection] });
    mockedIpc.collection.rename.mockResolvedValue(undefined);

    await useCollectionsStore.getState().renameCollection('coll-1', 'Renamed');

    const state = useCollectionsStore.getState();
    expect(state.collections[0].name).toBe('Renamed');
  });

  it('toggleFolder adds/removes from expandedFolders', () => {
    useCollectionsStore.getState().toggleFolder('folder-1');
    expect(useCollectionsStore.getState().expandedFolders.has('folder-1')).toBe(true);

    useCollectionsStore.getState().toggleFolder('folder-1');
    expect(useCollectionsStore.getState().expandedFolders.has('folder-1')).toBe(false);
  });

  it('toggleCollection expands and lazy-loads tree', async () => {
    useCollectionsStore.setState({ collections: [mockCollection] });
    mockedIpc.collection.getTree.mockResolvedValue(mockTree);

    useCollectionsStore.getState().toggleCollection('coll-1');
    expect(useCollectionsStore.getState().expandedCollections.has('coll-1')).toBe(true);

    // Wait for async loadTree
    await vi.waitFor(() => {
      expect(mockedIpc.collection.getTree).toHaveBeenCalledWith('coll-1');
    });
  });

  it('loadTree stores tree data', async () => {
    mockedIpc.collection.getTree.mockResolvedValue(mockTree);

    await useCollectionsStore.getState().loadTree('coll-1');

    const state = useCollectionsStore.getState();
    expect(state.trees['coll-1']).toEqual(mockTree);
  });
});
