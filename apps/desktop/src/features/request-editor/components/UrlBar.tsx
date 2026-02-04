import { useRef } from 'react';

interface UrlBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  variables?: [string, string][];
}

export function UrlBar({ value, onChange, onSend, variables }: UrlBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const variableMap = new Map(variables ?? []);

  // Check if URL contains any variable references
  const hasVariables = /\{\{\w+\}\}/.test(value);

  // Build a preview of the resolved URL
  const resolvedUrl = hasVariables
    ? value.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        variableMap.has(key) ? variableMap.get(key)! : match,
      )
    : null;

  return (
    <div className="flex-1 relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSend();
          }
        }}
        placeholder="Enter URL... (use {{variable}} for env variables)"
        className="w-full h-10 px-3 border-y border-border bg-bg-secondary text-text-primary text-sm
                   placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent
                   font-mono"
      />
      {resolvedUrl && resolvedUrl !== value && (
        <div className="absolute left-0 right-0 -bottom-5 px-3 text-[10px] text-accent truncate pointer-events-none">
          {resolvedUrl}
        </div>
      )}
    </div>
  );
}
