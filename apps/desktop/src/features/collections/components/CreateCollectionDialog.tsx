import { useState } from 'react';

interface CreateCollectionDialogProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function CreateCollectionDialog({ onSubmit, onCancel }: CreateCollectionDialogProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border rounded-lg p-4 w-80 shadow-xl">
        <h3 className="text-sm font-semibold text-text-primary mb-3">New Collection</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Collection name"
          autoFocus
          className="w-full h-9 px-3 text-sm bg-bg-primary border border-border rounded
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary
                       hover:bg-bg-hover rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded
                       hover:bg-accent-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
