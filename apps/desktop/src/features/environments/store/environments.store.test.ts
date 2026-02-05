import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Environment } from '@steq/domain';

vi.mock('../../../lib/ipc-client', () => ({
  ipc: {
    environment: {
      list: vi.fn(),
      create: vi.fn(),
      setActive: vi.fn(),
      deactivateAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getResolvedVariables: vi.fn(),
    },
  },
}));

import { useEnvironmentsStore } from './environments.store';
import { ipc } from '../../../lib/ipc-client';

const mockedIpc = vi.mocked(ipc, true);

const mockEnv: Environment = {
  id: 'env-1',
  workspace_id: 'ws-1',
  name: 'Production',
  is_active: true,
  variables: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockEnv2: Environment = {
  id: 'env-2',
  workspace_id: 'ws-1',
  name: 'Staging',
  is_active: false,
  variables: [],
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('environments.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEnvironmentsStore.setState({
      environments: [],
      activeEnvironmentId: null,
      resolvedVariables: [],
    });
  });

  it('loadEnvironments sets environments and active ID', async () => {
    mockedIpc.environment.list.mockResolvedValue([mockEnv, mockEnv2]);
    mockedIpc.environment.getResolvedVariables.mockResolvedValue([['key', 'val']]);

    await useEnvironmentsStore.getState().loadEnvironments('ws-1');

    const state = useEnvironmentsStore.getState();
    expect(state.environments).toHaveLength(2);
    expect(state.activeEnvironmentId).toBe('env-1');
    expect(state.resolvedVariables).toEqual([['key', 'val']]);
  });

  it('setActive activates and refreshes resolved variables', async () => {
    mockedIpc.environment.setActive.mockResolvedValue(undefined);
    mockedIpc.environment.getResolvedVariables.mockResolvedValue([['host', 'prod.example.com']]);

    await useEnvironmentsStore.getState().setActive('env-1', 'ws-1');

    const state = useEnvironmentsStore.getState();
    expect(state.activeEnvironmentId).toBe('env-1');
    expect(mockedIpc.environment.setActive).toHaveBeenCalledWith('env-1', 'ws-1');
    expect(state.resolvedVariables).toEqual([['host', 'prod.example.com']]);
  });

  it('setActive with null deactivates all', async () => {
    mockedIpc.environment.deactivateAll.mockResolvedValue(undefined);
    mockedIpc.environment.getResolvedVariables.mockResolvedValue([]);

    await useEnvironmentsStore.getState().setActive(null, 'ws-1');

    const state = useEnvironmentsStore.getState();
    expect(state.activeEnvironmentId).toBeNull();
    expect(mockedIpc.environment.deactivateAll).toHaveBeenCalledWith('ws-1');
  });

  it('updateEnvironment replaces in state', async () => {
    useEnvironmentsStore.setState({ environments: [mockEnv] });
    const updated = { ...mockEnv, name: 'Updated Prod' };
    mockedIpc.environment.update.mockResolvedValue(updated);

    await useEnvironmentsStore.getState().updateEnvironment({ id: 'env-1', name: 'Updated Prod' });

    const state = useEnvironmentsStore.getState();
    expect(state.environments[0].name).toBe('Updated Prod');
  });

  it('deleteEnvironment removes and reloads', async () => {
    useEnvironmentsStore.setState({ environments: [mockEnv, mockEnv2] });
    mockedIpc.environment.delete.mockResolvedValue(undefined);
    mockedIpc.environment.list.mockResolvedValue([mockEnv2]);
    mockedIpc.environment.getResolvedVariables.mockResolvedValue([]);

    await useEnvironmentsStore.getState().deleteEnvironment('env-1', 'ws-1');

    expect(mockedIpc.environment.delete).toHaveBeenCalledWith('env-1');
    expect(mockedIpc.environment.list).toHaveBeenCalledWith('ws-1');
  });
});
