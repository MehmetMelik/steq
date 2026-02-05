import { useState } from 'react';
import type { CollectionTreeNode, ApiRequest } from '@reqtor/domain';
import { useCollectionsStore } from '../store/collections.store';
import { CollectionItem } from './CollectionItem';

interface CollectionTreeProps {
  nodes: CollectionTreeNode[];
  requests: ApiRequest[];
  collectionId: string;
  depth?: number;
  onRequestClick: (request: ApiRequest) => void;
}

export function CollectionTreeView({
  nodes,
  requests,
  collectionId,
  depth = 0,
  onRequestClick,
}: CollectionTreeProps) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {nodes.map((node) => (
        <FolderNode
          key={node.folder.id}
          node={node}
          collectionId={collectionId}
          depth={depth}
          onRequestClick={onRequestClick}
        />
      ))}
      {requests.map((req) => (
        <CollectionItem key={req.id} request={req} onClick={onRequestClick} />
      ))}
    </div>
  );
}

function FolderNode({
  node,
  collectionId,
  depth,
  onRequestClick,
}: {
  node: CollectionTreeNode;
  collectionId: string;
  depth: number;
  onRequestClick: (request: ApiRequest) => void;
}) {
  const expandedFolders = useCollectionsStore((s) => s.expandedFolders);
  const toggleFolder = useCollectionsStore((s) => s.toggleFolder);
  const createFolder = useCollectionsStore((s) => s.createFolder);
  const deleteFolder = useCollectionsStore((s) => s.deleteFolder);

  const isExpanded = expandedFolders.has(node.folder.id);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateSubfolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(collectionId, node.folder.id, newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  return (
    <div>
      <div className="flex items-center group">
        <button
          onClick={() => toggleFolder(node.folder.id)}
          className="flex items-center gap-1 flex-1 px-2 py-1.5 text-sm text-left
                     hover:bg-bg-hover rounded transition-colors"
        >
          <span className="text-text-muted text-xs w-4 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="text-text-secondary">{node.folder.name}</span>
          <span className="text-text-muted text-xs ml-auto">
            {node.requests.length + node.children.length}
          </span>
        </button>
        <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNewFolder(true);
              if (!isExpanded) toggleFolder(node.folder.id);
            }}
            className="w-5 h-5 flex items-center justify-center text-text-muted
                       hover:text-text-primary rounded text-xs"
            title="New subfolder"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteFolder(node.folder.id, collectionId);
            }}
            className="w-5 h-5 flex items-center justify-center text-text-muted
                       hover:text-error rounded text-xs"
            title="Delete folder"
          >
            ×
          </button>
        </div>
      </div>
      {isExpanded && (
        <div style={{ paddingLeft: 12 }}>
          {showNewFolder && (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubfolder();
                  if (e.key === 'Escape') setShowNewFolder(false);
                }}
                placeholder="Folder name"
                autoFocus
                className="flex-1 h-6 px-1.5 text-xs bg-bg-secondary border border-border rounded
                           text-text-primary placeholder:text-text-muted focus:outline-none
                           focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
          <CollectionTreeView
            nodes={node.children}
            requests={node.requests}
            collectionId={collectionId}
            depth={depth + 1}
            onRequestClick={onRequestClick}
          />
        </div>
      )}
    </div>
  );
}
