import type { KeyValue } from '@reqtor/domain';

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const updateItem = (index: number, field: keyof KeyValue, value: string | boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-add a new empty row when typing in the last row
    if (index === items.length - 1 && field !== 'enabled' && value !== '') {
      newItems.push({ key: '', value: '', enabled: true });
    }

    onChange(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(index, 'enabled', e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateItem(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 h-8 px-2 text-sm bg-bg-secondary border border-border rounded
                       text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:ring-1 focus:ring-accent font-mono"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateItem(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 h-8 px-2 text-sm bg-bg-secondary border border-border rounded
                       text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:ring-1 focus:ring-accent font-mono"
          />
          <button
            onClick={() => removeItem(index)}
            className="w-8 h-8 flex items-center justify-center text-text-muted
                       hover:text-error hover:bg-bg-hover rounded transition-colors"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
