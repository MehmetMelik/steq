import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/cn';
import { useEnvironmentsStore } from '../store/environments.store';

interface EnvironmentSelectorProps {
  workspaceId: string;
}

export function EnvironmentSelector({ workspaceId }: EnvironmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const environments = useEnvironmentsStore((s) => s.environments);
  const activeEnvironmentId = useEnvironmentsStore((s) => s.activeEnvironmentId);
  const setActive = useEnvironmentsStore((s) => s.setActive);
  const loadEnvironments = useEnvironmentsStore((s) => s.loadEnvironments);

  useEffect(() => {
    if (workspaceId) {
      loadEnvironments(workspaceId);
    }
  }, [workspaceId, loadEnvironments]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
          'border border-border hover:bg-bg-hover',
          activeEnv ? 'text-accent' : 'text-text-muted',
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="truncate max-w-24">{activeEnv?.name ?? 'No Environment'}</span>
        <span className="text-text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-bg-secondary border border-border
                        rounded shadow-lg z-50 py-1">
          <button
            onClick={() => {
              setActive(null, workspaceId);
              setOpen(false);
            }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-hover transition-colors',
              !activeEnvironmentId ? 'text-accent font-medium' : 'text-text-secondary',
            )}
          >
            No Environment
          </button>
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => {
                setActive(env.id, workspaceId);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-bg-hover transition-colors',
                activeEnvironmentId === env.id
                  ? 'text-accent font-medium'
                  : 'text-text-secondary',
              )}
            >
              {env.name}
              <span className="text-text-muted ml-1">({env.variables.length} vars)</span>
            </button>
          ))}
          {environments.length === 0 && (
            <div className="px-3 py-1.5 text-xs text-text-muted">No environments created</div>
          )}
        </div>
      )}
    </div>
  );
}
