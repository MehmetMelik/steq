import { useEffect, useState } from 'react';
import type { ApiRequest } from '@apiary/domain';
import { useCollectionsStore } from '../store/collections.store';
import { CollectionTreeView } from './CollectionTree';
import { CreateCollectionDialog } from './CreateCollectionDialog';

interface CollectionsSidebarProps {
  workspaceId: string;
  onRequestClick: (request: ApiRequest) => void;
  onSaveRequest: (collectionId: string, folderId: string | null) => void;
  onImport?: () => void;
  onExport?: (collectionId: string, collectionName: string) => void;
}

export function CollectionsSidebar({
  workspaceId,
  onRequestClick,
  onSaveRequest,
  onImport,
  onExport,
}: CollectionsSidebarProps) {
  const collections = useCollectionsStore((s) => s.collections);
  const trees = useCollectionsStore((s) => s.trees);
  const expandedCollections = useCollectionsStore((s) => s.expandedCollections);
  const loadCollections = useCollectionsStore((s) => s.loadCollections);
  const toggleCollection = useCollectionsStore((s) => s.toggleCollection);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const createFolder = useCollectionsStore((s) => s.createFolder);

  const [showCreate, setShowCreate] = useState(false);
  const [newFolderFor, setNewFolderFor] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (workspaceId) {
      loadCollections(workspaceId);
    }
  }, [workspaceId, loadCollections]);

  const handleCreateCollection = async (name: string) => {
    await createCollection(workspaceId, name);
    setShowCreate(false);
  };

  const handleCreateFolder = async (collectionId: string) => {
    if (!newFolderName.trim()) return;
    await createFolder(collectionId, null, newFolderName.trim());
    setNewFolderName('');
    setNewFolderFor(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Collections
        </span>
        <div className="flex items-center gap-0.5">
          {onImport && (
            <button
              onClick={onImport}
              className="w-6 h-6 flex items-center justify-center text-text-muted
                         hover:text-text-primary hover:bg-bg-hover rounded transition-colors text-[10px]"
              title="Import Postman collection"
            >
              IMP
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="w-6 h-6 flex items-center justify-center text-text-muted
                       hover:text-text-primary hover:bg-bg-hover rounded transition-colors text-lg"
            title="New collection"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">
            No collections yet.
            <br />
            Click + to create one.
          </div>
        )}

        {collections.map((collection) => {
          const isExpanded = expandedCollections.has(collection.id);
          const tree = trees[collection.id];

          return (
            <div key={collection.id}>
              <div className="flex items-center group">
                <button
                  onClick={() => toggleCollection(collection.id)}
                  className="flex items-center gap-1 flex-1 px-3 py-1.5 text-sm text-left
                             hover:bg-bg-hover transition-colors"
                >
                  <span className="text-text-muted text-xs w-4 text-center">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="text-text-primary font-medium truncate">{collection.name}</span>
                </button>
                <div className="hidden group-hover:flex items-center gap-0.5 pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewFolderFor(collection.id);
                      if (!isExpanded) toggleCollection(collection.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-text-muted
                               hover:text-text-primary rounded text-xs"
                    title="New folder"
                  >
                    📁
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveRequest(collection.id, null);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-text-muted
                               hover:text-text-primary rounded text-xs"
                    title="Save request here"
                  >
                    💾
                  </button>
                  {onExport && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExport(collection.id, collection.name);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-text-muted
                                 hover:text-text-primary rounded text-[9px]"
                      title="Export as Postman"
                    >
                      EXP
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCollection(collection.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-text-muted
                               hover:text-error rounded text-xs"
                    title="Delete collection"
                  >
                    ×
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="pl-3">
                  {newFolderFor === collection.id && (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateFolder(collection.id);
                          if (e.key === 'Escape') {
                            setNewFolderFor(null);
                            setNewFolderName('');
                          }
                        }}
                        placeholder="Folder name"
                        autoFocus
                        className="flex-1 h-6 px-1.5 text-xs bg-bg-secondary border border-border rounded
                                   text-text-primary placeholder:text-text-muted focus:outline-none
                                   focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}
                  {tree ? (
                    <CollectionTreeView
                      nodes={tree.root_folders}
                      requests={tree.root_requests}
                      collectionId={collection.id}
                      onRequestClick={onRequestClick}
                    />
                  ) : (
                    <div className="px-3 py-1 text-xs text-text-muted">Loading...</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateCollectionDialog
          onSubmit={handleCreateCollection}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
