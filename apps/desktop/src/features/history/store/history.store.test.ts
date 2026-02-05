import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HistoryEntry } from '@apiary/domain';

vi.mock('../../../lib/ipc-client', () => ({
  ipc: {
    history: {
      list: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { useHistoryStore } from './history.store';
import { ipc } from '../../../lib/ipc-client';

const mockedIpc = vi.mocked(ipc, true);

const mockEntry: HistoryEntry = {
  id: 'hist-1',
  request_id: 'req-1',
  workspace_id: 'ws-1',
  method: 'GET',
  url: 'https://api.example.com/users',
  request_snapshot: '{}',
  response_status: 200,
  response_headers: null,
  response_body: '{"data":[]}',
  response_size: 12,
  duration_ms: 150,
  error: null,
  executed_at: '2024-01-01T00:00:00Z',
};

describe('history.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryStore.setState({
      entries: [],
      loading: false,
    });
  });

  it('loadHistory sets entries with loading states', async () => {
    mockedIpc.history.list.mockResolvedValue([mockEntry]);

    const promise = useHistoryStore.getState().loadHistory('ws-1');
    expect(useHistoryStore.getState().loading).toBe(true);

    await promise;

    const state = useHistoryStore.getState();
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].method).toBe('GET');
    expect(state.loading).toBe(false);
    expect(mockedIpc.history.list).toHaveBeenCalledWith({
      workspace_id: 'ws-1',
      limit: 100,
      offset: 0,
    });
  });

  it('clearHistory empties entries', async () => {
    useHistoryStore.setState({ entries: [mockEntry] });
    mockedIpc.history.clear.mockResolvedValue(undefined);

    await useHistoryStore.getState().clearHistory('ws-1');

    const state = useHistoryStore.getState();
    expect(state.entries).toHaveLength(0);
    expect(mockedIpc.history.clear).toHaveBeenCalledWith('ws-1');
  });

  it('deleteEntry removes and reloads', async () => {
    useHistoryStore.setState({ entries: [mockEntry] });
    mockedIpc.history.delete.mockResolvedValue(undefined);
    mockedIpc.history.list.mockResolvedValue([]);

    await useHistoryStore.getState().deleteEntry('hist-1', 'ws-1');

    expect(mockedIpc.history.delete).toHaveBeenCalledWith('hist-1');
    expect(mockedIpc.history.list).toHaveBeenCalledWith({
      workspace_id: 'ws-1',
      limit: 100,
      offset: 0,
    });
  });
});
