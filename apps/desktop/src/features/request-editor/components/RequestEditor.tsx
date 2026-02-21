import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../../lib/cn';
import { useRequestEditorStore, createEmptyDraft } from '../store/request-editor.store';
import { useResponseStore } from '../../response-viewer/store/response.store';
import { useTabsStore } from '../../tabs/store/tabs.store';
import { useEnvironmentsStore } from '../../environments/store/environments.store';
import { ipc } from '../../../lib/ipc-client';
import { resolveRequestVariables } from '@steq/domain';
import type { BodyType } from '@steq/domain';
import { MethodSelector } from './MethodSelector';
import { UrlBar } from './UrlBar';
import { SendButton } from './SendButton';
import { HeadersEditor } from './HeadersEditor';
import { QueryParamsEditor } from './QueryParamsEditor';
import { BodyEditor } from './BodyEditor';
import { CopyAsButton } from './CopyAsButton';
import { AuthEditor } from './AuthEditor';
import { SettingsEditor } from './SettingsEditor';

const EMPTY_GRAPHQL_CONTENT = JSON.stringify({
  query: '',
  variables: '',
  operationName: '',
});

type EditorTab = 'params' | 'headers' | 'body' | 'auth' | 'settings';

interface RequestEditorProps {
  tabId: string;
  workspaceId: string;
}

export function RequestEditor({ tabId, workspaceId }: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('params');

  const draft = useRequestEditorStore((s) => s.drafts.get(tabId)) ?? createEmptyDraft();
  const setDraftField = useRequestEditorStore((s) => s.setDraftField);
  const markSaved = useRequestEditorStore((s) => s.markSaved);
  const updateTab = useTabsStore((s) => s.updateTab);

  const response = useResponseStore((s) => s.responses.get(tabId));
  const responseLoading = response?.loading ?? false;
  const setResponseLoading = useResponseStore((s) => s.setLoading);
  const setResult = useResponseStore((s) => s.setResult);

  const resolvedVariables = useEnvironmentsStore((s) => s.resolvedVariables);

  // Sync tab header with draft
  useEffect(() => {
    updateTab(tabId, { name: draft.name, method: draft.method, dirty: draft.dirty });
  }, [tabId, draft.name, draft.method, draft.dirty, updateTab]);

  const handleSend = useCallback(async () => {
    if (!draft.url.trim()) return;
    setResponseLoading(tabId, true);
    try {
      const rawInput = {
        method: draft.method,
        url: draft.url,
        headers: draft.headers.filter((h) => h.key.trim() !== ''),
        query_params: draft.queryParams.filter((q) => q.key.trim() !== ''),
        body_type: draft.bodyType,
        body_content: draft.bodyType !== 'none' ? draft.bodyContent : null,
        auth_type: draft.authType,
        auth_config: draft.authConfig,
        settings: draft.settings,
      };
      // Resolve environment variables before sending
      const resolvedInput = resolveRequestVariables(rawInput, resolvedVariables);
      const result = await ipc.request.execute(resolvedInput, workspaceId, draft.id);
      setResult(tabId, result);
    } catch (err) {
      setResult(tabId, {
        status: 0,
        status_text: '',
        headers: [],
        body: '',
        size_bytes: 0,
        timing: { dns_ms: null, connect_ms: null, tls_ms: null, first_byte_ms: 0, total_ms: 0 },
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [tabId, draft, workspaceId, resolvedVariables, setResponseLoading, setResult]);

  const handleSave = useCallback(async () => {
    if (!draft.id || !draft.collectionId) return;
    const filteredHeaders = draft.headers.filter((h) => h.key.trim() !== '');
    const filteredParams = draft.queryParams.filter((q) => q.key.trim() !== '');
    await ipc.request.update({
      id: draft.id,
      name: draft.name,
      method: draft.method,
      url: draft.url,
      headers: filteredHeaders,
      query_params: filteredParams,
      body_type: draft.bodyType,
      body_content: draft.bodyType !== 'none' ? draft.bodyContent : null,
      auth_type: draft.authType,
      auth_config: draft.authConfig,
    });
    markSaved(tabId, draft.id, draft.collectionId, draft.folderId);
  }, [tabId, draft, markSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Request name */}
      <div className="flex items-center gap-2 px-3 pt-2">
        <input
          data-testid="request-name-input"
          type="text"
          value={draft.name}
          onChange={(e) => setDraftField(tabId, { name: e.target.value })}
          className="text-sm text-text-secondary bg-transparent border-none focus:outline-none
                     focus:text-text-primary placeholder:text-text-muted flex-1 min-w-0"
          placeholder="Request name"
        />
        {draft.id && draft.dirty && (
          <span className="text-xs text-warning">unsaved</span>
        )}
        {draft.id && !draft.dirty && (
          <span className="text-xs text-text-muted">saved</span>
        )}
      </div>

      {/* URL bar */}
      <div className="flex items-center p-3 pt-1">
        <MethodSelector
          value={draft.method}
          onChange={(method) => setDraftField(tabId, { method })}
        />
        <UrlBar
          value={draft.url}
          onChange={(url) => setDraftField(tabId, { url })}
          onSend={handleSend}
          variables={resolvedVariables}
        />
        <SendButton onClick={handleSend} loading={responseLoading} />
        <CopyAsButton draft={draft} resolvedVariables={resolvedVariables} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`editor-tab-${tab.id}`}
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

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'headers' && (
          <HeadersEditor
            headers={draft.headers}
            onChange={(headers) => setDraftField(tabId, { headers })}
          />
        )}
        {activeTab === 'params' && (
          <QueryParamsEditor
            params={draft.queryParams}
            onChange={(queryParams) => setDraftField(tabId, { queryParams })}
          />
        )}
        {activeTab === 'body' && (
          <BodyEditor
            bodyType={draft.bodyType}
            bodyContent={draft.bodyContent}
            onTypeChange={(bodyType: BodyType) => {
              const updates: { bodyType: BodyType; method?: typeof draft.method; bodyContent?: string } = { bodyType };
              // Auto-switch to POST when GraphQL body type is selected
              if (bodyType === 'graphql' && draft.method === 'GET') {
                updates.method = 'POST';
              }
              // Initialize empty GraphQL structure when switching to GraphQL
              if (bodyType === 'graphql' && draft.bodyType !== 'graphql') {
                updates.bodyContent = EMPTY_GRAPHQL_CONTENT;
              }
              setDraftField(tabId, updates);
            }}
            onContentChange={(bodyContent) => setDraftField(tabId, { bodyContent })}
          />
        )}
        {activeTab === 'auth' && (
          <AuthEditor
            authType={draft.authType}
            authConfig={draft.authConfig}
            onTypeChange={(authType, authConfig) =>
              setDraftField(tabId, { authType, authConfig })
            }
            onConfigChange={(authConfig) =>
              setDraftField(tabId, { authConfig })
            }
          />
        )}
        {activeTab === 'settings' && (
          <SettingsEditor
            settings={draft.settings}
            onChange={(settings) => setDraftField(tabId, { settings })}
          />
        )}
      </div>
    </div>
  );
}
