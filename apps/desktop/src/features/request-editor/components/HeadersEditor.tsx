import { KeyValueEditor } from '../../../components/ui/KeyValueEditor';
import type { KeyValue } from '@reqtor/domain';

interface HeadersEditorProps {
  headers: KeyValue[];
  onChange: (headers: KeyValue[]) => void;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
        Headers
      </div>
      <KeyValueEditor
        items={headers}
        onChange={onChange}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
      />
    </div>
  );
}
