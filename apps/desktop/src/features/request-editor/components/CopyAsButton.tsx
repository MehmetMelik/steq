import { useState, useRef, useEffect } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { cn } from '../../../lib/cn';
import { exportRequest, ExportFormat, ExportRequestInput } from '@steq/domain';
import type { RequestDraft } from '../store/request-editor.store';

interface CopyAsButtonProps {
  draft: RequestDraft;
  resolvedVariables: [string, string][];
}

const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'wget', label: 'wget' },
  { id: 'fetch', label: 'fetch' },
  { id: 'httpie', label: 'HTTPie' },
];

export function CopyAsButton({ draft, resolvedVariables }: CopyAsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleCopy = async (format: ExportFormat) => {
    const variableMap = new Map(resolvedVariables);

    const resolveString = (str: string) =>
      str.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        variableMap.has(key) ? variableMap.get(key)! : match
      );

    const input: ExportRequestInput = {
      method: draft.method,
      url: resolveString(draft.url),
      headers: draft.headers
        .filter((h) => h.key.trim())
        .map((h) => ({
          key: resolveString(h.key),
          value: resolveString(h.value),
          enabled: h.enabled,
        })),
      queryParams: draft.queryParams
        .filter((p) => p.key.trim())
        .map((p) => ({
          key: resolveString(p.key),
          value: resolveString(p.value),
          enabled: p.enabled,
        })),
      bodyType: draft.bodyType,
      bodyContent: draft.bodyContent ? resolveString(draft.bodyContent) : null,
    };

    const exported = exportRequest(input, format);

    try {
      await writeText(exported);
      setCopied(true);
      setIsOpen(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="relative ml-2" ref={dropdownRef}>
      <button
        data-testid="copy-as-button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-10 px-3 rounded-lg bg-bg-secondary text-text-secondary text-sm',
          'hover:bg-bg-tertiary hover:text-text-primary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent',
          'flex items-center gap-1',
        )}
      >
        {copied ? 'Copied!' : 'Copy'}
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-1 w-32 py-1 rounded-lg shadow-lg z-50',
            'bg-bg-secondary border border-border',
          )}
        >
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              data-testid={`copy-as-${format.id}`}
              onClick={() => handleCopy(format.id)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm text-text-secondary',
                'hover:bg-bg-tertiary hover:text-text-primary transition-colors',
              )}
            >
              {format.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
