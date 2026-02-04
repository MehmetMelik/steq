import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { useResponseStore } from '../store/response.store';
import { ResponseMeta } from './ResponseMeta';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';

type Tab = 'body' | 'headers';

interface ResponseViewerProps {
  tabId: string;
}

export function ResponseViewer({ tabId }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('body');
  const response = useResponseStore((s) => s.responses.get(tabId));
  const result = response?.result ?? null;
  const loading = response?.loading ?? false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Sending request...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <div className="text-lg mb-1">No response yet</div>
          <div className="text-sm">Enter a URL and click Send, or press Ctrl+Enter</div>
        </div>
      </div>
    );
  }

  const contentType = result.headers.find(
    (h) => h.key.toLowerCase() === 'content-type',
  )?.value;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: `Headers (${result.headers.length})` },
  ];

  return (
    <div className="flex flex-col h-full">
      <ResponseMeta result={result} />
      <div className="flex border-b border-border px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && <ResponseBody body={result.body} contentType={contentType} />}
        {activeTab === 'headers' && <ResponseHeaders headers={result.headers} />}
      </div>
    </div>
  );
}
