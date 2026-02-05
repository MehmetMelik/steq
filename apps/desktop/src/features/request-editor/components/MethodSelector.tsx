import { cn } from '../../../lib/cn';
import type { HttpMethod } from '@apiary/domain';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
};

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export function MethodSelector({ value, onChange }: MethodSelectorProps) {
  return (
    <select
      data-testid="method-selector"
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
      className={cn(
        'h-10 px-3 rounded-l-lg border border-border bg-bg-secondary font-bold text-sm',
        'focus:outline-none focus:ring-2 focus:ring-accent appearance-none cursor-pointer',
        METHOD_COLORS[value],
      )}
    >
      {METHODS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
