import { useEffect } from 'react';
import { cn } from '../../../lib/cn';
import { useHistoryStore } from '../store/history.store';
import type { HistoryEntry } from '@steq/domain';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
};

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-success',
  '3': 'text-accent',
  '4': 'text-warning',
  '5': 'text-error',
};

function getStatusColor(status: number | null): string {
  if (!status) return 'text-error';
  const category = String(status)[0];
  return STATUS_COLORS[category] ?? 'text-text-muted';
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

interface HistoryPanelProps {
  workspaceId: string;
  onEntryClick: (entry: HistoryEntry) => void;
}

export function HistoryPanel({ workspaceId, onEntryClick }: HistoryPanelProps) {
  const entries = useHistoryStore((s) => s.entries);
  const loading = useHistoryStore((s) => s.loading);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  useEffect(() => {
    if (workspaceId) {
      loadHistory(workspaceId);
    }
  }, [workspaceId, loadHistory]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          History
        </span>
        {entries.length > 0 && (
          <button
            onClick={() => clearHistory(workspaceId)}
            className="text-xs text-text-muted hover:text-error transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">Loading...</div>
        )}

        {!loading && entries.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-muted text-center">
            No history yet.
            <br />
            Send a request to see it here.
          </div>
        )}

        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onEntryClick(entry)}
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover transition-colors
                       border-b border-border/50 group"
          >
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-bold w-8', METHOD_COLORS[entry.method] ?? 'text-text-muted')}>
                {entry.method.slice(0, 3)}
              </span>
              <span className={cn('text-[10px] font-mono', getStatusColor(entry.response_status))}>
                {entry.response_status ?? 'ERR'}
              </span>
              <span className="text-xs text-text-secondary truncate flex-1">
                {extractPath(entry.url)}
              </span>
              <span className="text-[10px] text-text-muted shrink-0">
                {entry.duration_ms != null ? `${entry.duration_ms}ms` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-muted truncate">
                {entry.url}
              </span>
              <span className="text-[10px] text-text-muted shrink-0 ml-auto">
                {formatTime(entry.executed_at)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
