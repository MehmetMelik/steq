import { useMemo, useCallback } from 'react';
import { cn } from '../../../lib/cn';

interface GraphQLContent {
  query: string;
  variables: string;
  operationName: string;
}

interface GraphQLEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function parseContent(content: string): GraphQLContent {
  try {
    const parsed = JSON.parse(content);
    return {
      query: parsed.query ?? '',
      variables: parsed.variables ?? '',
      operationName: parsed.operationName ?? '',
    };
  } catch {
    return { query: '', variables: '', operationName: '' };
  }
}

function isValidJson(str: string): boolean {
  if (!str.trim()) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function GraphQLEditor({ content, onChange }: GraphQLEditorProps) {
  const parsed = useMemo(() => parseContent(content), [content]);

  const handleChange = useCallback(
    (field: keyof GraphQLContent, value: string) => {
      const updated: GraphQLContent = {
        ...parsed,
        [field]: value,
      };
      onChange(JSON.stringify(updated));
    },
    [parsed, onChange],
  );

  const variablesValid = useMemo(() => isValidJson(parsed.variables), [parsed.variables]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">
          Query
        </label>
        <textarea
          value={parsed.query}
          onChange={(e) => handleChange('query', e.target.value)}
          placeholder="query { users { id name } }"
          className="w-full h-40 p-3 bg-bg-secondary border border-border rounded text-sm
                     text-text-primary placeholder:text-text-muted font-mono resize-y
                     focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">
            Variables
          </label>
          {!variablesValid && (
            <span className="text-xs text-red-500">Invalid JSON</span>
          )}
        </div>
        <textarea
          value={parsed.variables}
          onChange={(e) => handleChange('variables', e.target.value)}
          placeholder='{ "id": "123" }'
          className={cn(
            'w-full h-24 p-3 bg-bg-secondary border rounded text-sm',
            'text-text-primary placeholder:text-text-muted font-mono resize-y',
            'focus:outline-none focus:ring-1 focus:ring-accent',
            variablesValid ? 'border-border' : 'border-red-500',
          )}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">
          Operation Name
        </label>
        <input
          type="text"
          value={parsed.operationName}
          onChange={(e) => handleChange('operationName', e.target.value)}
          placeholder="Optional operation name"
          className="w-full p-2 bg-bg-secondary border border-border rounded text-sm
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  );
}
