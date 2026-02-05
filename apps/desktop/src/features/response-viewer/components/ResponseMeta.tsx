import { cn } from '../../../lib/cn';
import type { ExecutionResult } from '@reqtor/domain';

interface ResponseMetaProps {
  result: ExecutionResult;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-success/20 text-success';
  if (status >= 300 && status < 400) return 'bg-warning/20 text-warning';
  if (status >= 400 && status < 500) return 'bg-error/20 text-error';
  if (status >= 500) return 'bg-error/20 text-error';
  return 'bg-bg-hover text-text-muted';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function ResponseMeta({ result }: ResponseMetaProps) {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border">
      {result.status > 0 && (
        <span data-testid="response-status" className={cn('px-2 py-0.5 rounded text-xs font-bold', statusColor(result.status))}>
          {result.status} {result.status_text}
        </span>
      )}
      <span data-testid="response-time" className="text-xs text-text-muted">
        {formatMs(result.timing.total_ms)}
      </span>
      {result.size_bytes > 0 && (
        <span data-testid="response-size" className="text-xs text-text-muted">{formatBytes(result.size_bytes)}</span>
      )}
      {result.error && (
        <span className="text-xs text-error font-medium">{result.error}</span>
      )}
    </div>
  );
}
