import { cn } from '../../../lib/cn';
import type { BodyType } from '@reqtor/domain';

const BODY_TYPES: { label: string; value: BodyType }[] = [
  { label: 'None', value: 'none' },
  { label: 'JSON', value: 'json' },
  { label: 'Text', value: 'text' },
  { label: 'Form URL Encoded', value: 'form_url_encoded' },
];

interface BodyEditorProps {
  bodyType: BodyType;
  bodyContent: string;
  onTypeChange: (type: BodyType) => void;
  onContentChange: (content: string) => void;
}

export function BodyEditor({ bodyType, bodyContent, onTypeChange, onContentChange }: BodyEditorProps) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
        Body
      </div>
      <div className="flex gap-1 mb-2">
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.value}
            onClick={() => onTypeChange(bt.value)}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              bodyType === bt.value
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover',
            )}
          >
            {bt.label}
          </button>
        ))}
      </div>
      {bodyType !== 'none' && (
        <textarea
          value={bodyContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={bodyType === 'json' ? '{\n  \n}' : 'Enter body content...'}
          className="w-full h-48 p-3 bg-bg-secondary border border-border rounded text-sm
                     text-text-primary placeholder:text-text-muted font-mono resize-y
                     focus:outline-none focus:ring-1 focus:ring-accent"
        />
      )}
    </div>
  );
}
