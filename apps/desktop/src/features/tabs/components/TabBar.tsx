import { cn } from '../../../lib/cn';
import { useTabsStore } from '../store/tabs.store';
import type { HttpMethod } from '@reqtor/domain';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
};

interface TabBarProps {
  onNewTab: () => void;
}

export function TabBar({ onNewTab }: TabBarProps) {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);

  return (
    <div data-testid="tab-bar" className="flex items-center h-9 bg-bg-secondary border-b border-border shrink-0 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'flex items-center gap-1.5 h-full px-3 text-xs border-r border-border',
            'transition-colors shrink-0 max-w-48 group relative',
            activeTabId === tab.id
              ? 'bg-bg-primary text-text-primary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover',
          )}
        >
          <span className={cn('font-bold text-[10px]', METHOD_COLORS[tab.method])}>
            {tab.method.slice(0, 3)}
          </span>
          <span className="truncate">{tab.name}</span>
          {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
          {tabs.length > 1 && (
            <span
              data-testid="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-1 w-4 h-4 flex items-center justify-center rounded
                         opacity-0 group-hover:opacity-100 hover:bg-bg-hover
                         text-text-muted hover:text-text-primary transition-all text-xs"
            >
              ×
            </span>
          )}
          {activeTabId === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      ))}
      <button
        data-testid="new-tab-button"
        onClick={onNewTab}
        className="flex items-center justify-center w-8 h-full text-text-muted
                   hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
        title="New tab (Ctrl+T)"
      >
        +
      </button>
    </div>
  );
}
