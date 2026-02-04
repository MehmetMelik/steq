import { useEffect, useState } from 'react';
import { RequestEditor } from '../../features/request-editor/components/RequestEditor';
import { ResponseViewer } from '../../features/response-viewer/components/ResponseViewer';
import { CollectionsSidebar } from '../../features/collections/components/CollectionsSidebar';
import { HistoryPanel } from '../../features/history/components/HistoryPanel';
import { TabBar } from '../../features/tabs/components/TabBar';
import { EnvironmentSelector } from '../../features/environments/components/EnvironmentSelector';
import { EnvironmentEditor } from '../../features/environments/components/EnvironmentEditor';
import { useRequestEditorStore, requestToDraft, createEmptyDraft } from '../../features/request-editor/store/request-editor.store';
import { useCollectionsStore } from '../../features/collections/store/collections.store';
import { useResponseStore } from '../../features/response-viewer/store/response.store';
import { useTabsStore } from '../../features/tabs/store/tabs.store';
import { useHistoryStore } from '../../features/history/store/history.store';
import { cn } from '../../lib/cn';
import { ipc } from '../../lib/ipc-client';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ModeToggle } from '../../features/settings/components/ModeToggle';
import { CommandPalette } from '../../features/command-palette/components/CommandPalette';
import type { Command } from '../../features/command-palette/components/CommandPalette';
import { useSettingsStore } from '../../features/settings/store/settings.store';
import type { ApiRequest, HistoryEntry, HttpMethod } from '@apiary/domain';

type SidebarTab = 'collections' | 'history';

export function AppShell() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('collections');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const mode = useSettingsStore((s) => s.mode);
  const toggleMode = useSettingsStore((s) => s.toggleMode);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const activeTabId = useTabsStore((s) => s.activeTabId);
  const addTab = useTabsStore((s) => s.addTab);
  const closeTab = useTabsStore((s) => s.closeTab);

  const initEditorTab = useRequestEditorStore((s) => s.initTab);
  const removeEditorTab = useRequestEditorStore((s) => s.removeTab);
  const getDraft = useRequestEditorStore((s) => s.getDraft);
  const markSaved = useRequestEditorStore((s) => s.markSaved);

  const removeResponseTab = useResponseStore((s) => s.removeTab);

  const loadTree = useCollectionsStore((s) => s.loadTree);
  const loadHistory = useHistoryStore((s) => s.loadHistory);

  // Load workspace on mount and init the first tab's draft
  useEffect(() => {
    ipc.workspace.getCurrent().then((ws) => setWorkspaceId(ws.id));
  }, []);

  // Ensure active tab has a draft initialized
  useEffect(() => {
    if (activeTabId) {
      const drafts = useRequestEditorStore.getState().drafts;
      if (!drafts.has(activeTabId)) {
        initEditorTab(activeTabId);
      }
    }
  }, [activeTabId, initEditorTab]);

  // Listen for tab close to clean up stores
  useEffect(() => {
    const unsub = useTabsStore.subscribe((state, prev) => {
      const closedIds = prev.tabs
        .filter((t) => !state.tabs.find((s) => s.id === t.id))
        .map((t) => t.id);
      closedIds.forEach((id) => {
        removeEditorTab(id);
        removeResponseTab(id);
      });
    });
    return unsub;
  }, [removeEditorTab, removeResponseTab]);

  // Keyboard shortcuts: Ctrl+T new tab, Ctrl+W close tab
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, closeTab]);

  // Refresh history when switching to history tab
  useEffect(() => {
    if (sidebarTab === 'history' && workspaceId) {
      loadHistory(workspaceId);
    }
  }, [sidebarTab, workspaceId, loadHistory]);

  const handleNewTab = () => {
    const tabId = addTab();
    initEditorTab(tabId);
  };

  const handleRequestClick = (request: ApiRequest) => {
    // Check if this request is already open in a tab
    const tabs = useTabsStore.getState().tabs;
    const existingTab = tabs.find((t) => t.requestId === request.id);
    if (existingTab) {
      useTabsStore.getState().setActiveTab(existingTab.id);
      return;
    }

    // Open in a new tab
    const tabId = addTab({
      name: request.name,
      method: request.method,
      requestId: request.id,
    });
    initEditorTab(tabId, requestToDraft(request));
  };

  const handleHistoryClick = (entry: HistoryEntry) => {
    // Open history entry in a new tab with its snapshot data
    const tabId = addTab({
      name: `${entry.method} ${entry.url}`,
      method: entry.method as HttpMethod,
    });
    try {
      const snapshot = JSON.parse(entry.request_snapshot);
      const draft = {
        ...createEmptyDraft(),
        method: snapshot.method ?? entry.method,
        url: snapshot.url ?? entry.url,
        headers: snapshot.headers ?? [{ key: '', value: '', enabled: true }],
        queryParams: snapshot.query_params ?? [{ key: '', value: '', enabled: true }],
        bodyType: snapshot.body_type ?? 'none',
        bodyContent: snapshot.body_content ?? '',
      };
      initEditorTab(tabId, draft);
    } catch {
      initEditorTab(tabId);
    }
  };

  const handleSaveRequest = async (collectionId: string, folderId: string | null) => {
    if (!activeTabId) return;
    const draft = getDraft(activeTabId);
    if (!draft.url.trim()) return;

    const filteredHeaders = draft.headers.filter((h) => h.key.trim() !== '');
    const filteredParams = draft.queryParams.filter((q) => q.key.trim() !== '');

    if (draft.id) {
      await ipc.request.update({
        id: draft.id,
        name: draft.name,
        method: draft.method,
        url: draft.url,
        headers: filteredHeaders,
        query_params: filteredParams,
        body_type: draft.bodyType,
        body_content: draft.bodyType !== 'none' ? draft.bodyContent : null,
        collection_id: collectionId,
        folder_id: folderId,
      });
      markSaved(activeTabId, draft.id, collectionId, folderId);
      useTabsStore.getState().updateTab(activeTabId, { requestId: draft.id, dirty: false });
    } else {
      const created = await ipc.request.create({
        name: draft.name || draft.url,
        method: draft.method,
        url: draft.url,
        headers: filteredHeaders,
        query_params: filteredParams,
        body_type: draft.bodyType,
        body_content: draft.bodyType !== 'none' ? draft.bodyContent : null,
        collection_id: collectionId,
        folder_id: folderId,
      });
      markSaved(activeTabId, created.id, collectionId, folderId);
      useTabsStore.getState().updateTab(activeTabId, { requestId: created.id, dirty: false });
    }

    await loadTree(collectionId);
  };

  const handleImportPostman = async () => {
    const filePath = await open({
      title: 'Import Postman Collection',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return;
    try {
      const result = await ipc.io.importPostman(filePath, workspaceId);
      // Reload collections after import
      useCollectionsStore.getState().loadCollections(workspaceId);
      alert(`Imported "${result.collection_name}": ${result.request_count} requests, ${result.folder_count} folders`);
    } catch (err) {
      alert(`Import failed: ${err}`);
    }
  };

  const handleExportPostman = async (collectionId: string, collectionName: string) => {
    const filePath = await save({
      title: 'Export Postman Collection',
      defaultPath: `${collectionName}.postman_collection.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!filePath) return;
    try {
      await ipc.io.exportPostman(collectionId, filePath);
      alert(`Collection exported to ${filePath}`);
    } catch (err) {
      alert(`Export failed: ${err}`);
    }
  };

  const commands: Command[] = [
    { id: 'new-tab', label: 'New Tab', shortcut: 'Ctrl+T', action: handleNewTab },
    { id: 'close-tab', label: 'Close Tab', shortcut: 'Ctrl+W', action: () => activeTabId && closeTab(activeTabId) },
    { id: 'toggle-mode', label: 'Toggle Enterprise/Hacker Mode', action: toggleMode },
    { id: 'toggle-theme', label: 'Toggle Light/Dark Theme', action: toggleTheme },
    { id: 'show-collections', label: 'Show Collections', action: () => setSidebarTab('collections') },
    { id: 'show-history', label: 'Show History', action: () => setSidebarTab('history') },
    { id: 'manage-env', label: 'Manage Environments', action: () => setShowEnvEditor(true) },
    { id: 'import-postman', label: 'Import Postman Collection', action: handleImportPostman },
  ];

  const sidebarTabs: { id: SidebarTab; label: string }[] = [
    { id: 'collections', label: 'Collections' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="flex items-center justify-between h-10 px-4 border-b border-border bg-bg-secondary shrink-0">
        <span className="text-sm font-bold text-accent">Apiary</span>
        <div className="flex items-center gap-2">
          {workspaceId && (
            <>
              <EnvironmentSelector workspaceId={workspaceId} />
              <button
                onClick={() => setShowEnvEditor(true)}
                className="px-2 py-1 text-xs text-text-muted hover:text-text-primary
                           hover:bg-bg-hover rounded transition-colors"
                title="Manage environments"
              >
                Env
              </button>
            </>
          )}
          <ModeToggle />
          {mode === 'hacker' && (
            <button
              onClick={() => setShowCommandPalette(true)}
              className="px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary
                         hover:bg-bg-hover rounded transition-colors font-mono"
              title="Command palette (Cmd+K)"
            >
              Cmd+K
            </button>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <TabBar onNewTab={handleNewTab} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-60 shrink-0 border-r border-border bg-bg-secondary overflow-hidden flex flex-col">
          {/* Sidebar tab switcher */}
          <div className="flex border-b border-border shrink-0">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors relative',
                  sidebarTab === tab.id
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {tab.label}
                {sidebarTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {sidebarTab === 'collections' && workspaceId && (
              <CollectionsSidebar
                workspaceId={workspaceId}
                onRequestClick={handleRequestClick}
                onSaveRequest={handleSaveRequest}
                onImport={handleImportPostman}
                onExport={handleExportPostman}
              />
            )}
            {sidebarTab === 'history' && workspaceId && (
              <HistoryPanel
                workspaceId={workspaceId}
                onEntryClick={handleHistoryClick}
              />
            )}
          </div>
        </div>

        {/* Request editor panel */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {activeTabId && <RequestEditor tabId={activeTabId} workspaceId={workspaceId} />}
        </div>

        {/* Response viewer panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeTabId && <ResponseViewer tabId={activeTabId} />}
        </div>
      </div>

      {/* Environment Editor modal */}
      {showEnvEditor && workspaceId && (
        <EnvironmentEditor
          workspaceId={workspaceId}
          onClose={() => setShowEnvEditor(false)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        commands={commands}
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
}
