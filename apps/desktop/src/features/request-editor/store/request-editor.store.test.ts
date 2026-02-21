import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRequestEditorStore,
  createEmptyDraft,
  requestToDraft,
} from './request-editor.store';
import type { ApiRequest } from '@steq/domain';

describe('request-editor.store', () => {
  beforeEach(() => {
    useRequestEditorStore.setState({ drafts: new Map() });
  });

  it('getDraft returns empty draft for unknown tabId', () => {
    const draft = useRequestEditorStore.getState().getDraft('unknown');
    expect(draft.id).toBeNull();
    expect(draft.name).toBe('New Request');
    expect(draft.method).toBe('GET');
    expect(draft.url).toBe('');
    expect(draft.dirty).toBe(false);
  });

  it('initTab stores draft', () => {
    useRequestEditorStore.getState().initTab('tab-1');
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.name).toBe('New Request');
    expect(draft.method).toBe('GET');
  });

  it('initTab with custom draft', () => {
    const custom = {
      ...createEmptyDraft(),
      name: 'Custom',
      method: 'POST' as const,
      url: 'https://example.com',
    };
    useRequestEditorStore.getState().initTab('tab-1', custom);
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.name).toBe('Custom');
    expect(draft.method).toBe('POST');
    expect(draft.url).toBe('https://example.com');
  });

  it('setDraftField updates fields and marks dirty', () => {
    useRequestEditorStore.getState().initTab('tab-1');
    useRequestEditorStore.getState().setDraftField('tab-1', {
      url: 'https://changed.com',
      method: 'PUT',
    });
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.url).toBe('https://changed.com');
    expect(draft.method).toBe('PUT');
    expect(draft.dirty).toBe(true);
  });

  it('setDraftField only modifies targeted tab', () => {
    useRequestEditorStore.getState().initTab('tab-1');
    useRequestEditorStore.getState().initTab('tab-2');

    useRequestEditorStore.getState().setDraftField('tab-1', { url: 'changed' });

    expect(useRequestEditorStore.getState().getDraft('tab-1').url).toBe('changed');
    expect(useRequestEditorStore.getState().getDraft('tab-2').url).toBe('');
  });

  it('removeTab removes draft', () => {
    useRequestEditorStore.getState().initTab('tab-1');
    useRequestEditorStore.getState().removeTab('tab-1');
    // getDraft returns empty for removed tab
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.name).toBe('New Request');
    expect(useRequestEditorStore.getState().drafts.has('tab-1')).toBe(false);
  });

  it('loadRequest converts ApiRequest to draft', () => {
    const request: ApiRequest = {
      id: 'req-1',
      name: 'Get Users',
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: [{ key: 'Auth', value: 'Bearer abc', enabled: true }],
      query_params: [{ key: 'page', value: '1', enabled: true }],
      body_type: 'json',
      body_content: '{"key":"val"}',
      auth_type: 'none',
      auth_config: { type: 'none' },
      collection_id: 'coll-1',
      folder_id: null,
      sort_order: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    useRequestEditorStore.getState().loadRequest('tab-1', request);
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.id).toBe('req-1');
    expect(draft.name).toBe('Get Users');
    expect(draft.method).toBe('GET');
    expect(draft.url).toBe('https://api.example.com/users');
    expect(draft.dirty).toBe(false);
  });

  it('markSaved sets IDs and dirty=false', () => {
    useRequestEditorStore.getState().initTab('tab-1');
    useRequestEditorStore.getState().setDraftField('tab-1', { url: 'test' });
    expect(useRequestEditorStore.getState().getDraft('tab-1').dirty).toBe(true);

    useRequestEditorStore.getState().markSaved('tab-1', 'req-1', 'coll-1', 'folder-1');
    const draft = useRequestEditorStore.getState().getDraft('tab-1');
    expect(draft.id).toBe('req-1');
    expect(draft.collectionId).toBe('coll-1');
    expect(draft.folderId).toBe('folder-1');
    expect(draft.dirty).toBe(false);
  });
});

describe('createEmptyDraft', () => {
  it('returns correct defaults', () => {
    const draft = createEmptyDraft();
    expect(draft.id).toBeNull();
    expect(draft.name).toBe('New Request');
    expect(draft.method).toBe('GET');
    expect(draft.url).toBe('');
    expect(draft.bodyType).toBe('none');
    expect(draft.bodyContent).toBe('');
    expect(draft.collectionId).toBeNull();
    expect(draft.folderId).toBeNull();
    expect(draft.dirty).toBe(false);
  });

  it('has trailing empty KV rows', () => {
    const draft = createEmptyDraft();
    expect(draft.headers).toHaveLength(1);
    expect(draft.headers[0].key).toBe('');
    expect(draft.headers[0].value).toBe('');
    expect(draft.headers[0].enabled).toBe(true);
    expect(draft.queryParams).toHaveLength(1);
    expect(draft.queryParams[0].key).toBe('');
  });
});

describe('requestToDraft', () => {
  const baseRequest: ApiRequest = {
    id: 'req-1',
    name: 'Test',
    method: 'POST',
    url: 'https://example.com',
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    query_params: [{ key: 'q', value: 'test', enabled: true }],
    body_type: 'json',
    body_content: '{"a":1}',
    auth_type: 'none',
    auth_config: { type: 'none' },
    collection_id: 'coll-1',
    folder_id: 'folder-1',
    sort_order: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  it('converts correctly', () => {
    const draft = requestToDraft(baseRequest);
    expect(draft.id).toBe('req-1');
    expect(draft.name).toBe('Test');
    expect(draft.method).toBe('POST');
    expect(draft.url).toBe('https://example.com');
    expect(draft.bodyType).toBe('json');
    expect(draft.bodyContent).toBe('{"a":1}');
    expect(draft.collectionId).toBe('coll-1');
    expect(draft.folderId).toBe('folder-1');
    // Has trailing empty row for headers and params
    expect(draft.headers).toHaveLength(2);
    expect(draft.headers[1].key).toBe('');
    expect(draft.queryParams).toHaveLength(2);
    expect(draft.queryParams[1].key).toBe('');
  });

  it('handles empty headers/params', () => {
    const request: ApiRequest = {
      ...baseRequest,
      headers: [],
      query_params: [],
    };
    const draft = requestToDraft(request);
    expect(draft.headers).toHaveLength(1);
    expect(draft.headers[0].key).toBe('');
    expect(draft.queryParams).toHaveLength(1);
    expect(draft.queryParams[0].key).toBe('');
  });

  it('sets dirty=false', () => {
    const draft = requestToDraft(baseRequest);
    expect(draft.dirty).toBe(false);
  });

  it('uses body_content or empty string', () => {
    const withBody = requestToDraft(baseRequest);
    expect(withBody.bodyContent).toBe('{"a":1}');

    const noBody = requestToDraft({ ...baseRequest, body_content: null });
    expect(noBody.bodyContent).toBe('');
  });
});
