import { KeyValueEditor } from '../../../components/ui/KeyValueEditor';
import type { KeyValue } from '@apiary/domain';

interface QueryParamsEditorProps {
  params: KeyValue[];
  onChange: (params: KeyValue[]) => void;
}

export function QueryParamsEditor({ params, onChange }: QueryParamsEditorProps) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
        Query Parameters
      </div>
      <KeyValueEditor
        items={params}
        onChange={onChange}
        keyPlaceholder="Parameter name"
        valuePlaceholder="Parameter value"
      />
    </div>
  );
}
