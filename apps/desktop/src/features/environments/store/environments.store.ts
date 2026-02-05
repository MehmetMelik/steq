import { create } from 'zustand';
import type { Environment, UpdateEnvironmentInput } from '@steq/domain';
import { ipc } from '../../../lib/ipc-client';

interface EnvironmentsState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  resolvedVariables: [string, string][];

  loadEnvironments: (workspaceId: string) => Promise<void>;
  createEnvironment: (workspaceId: string, name: string) => Promise<Environment>;
  setActive: (id: string | null, workspaceId: string) => Promise<void>;
  updateEnvironment: (input: UpdateEnvironmentInput) => Promise<void>;
  deleteEnvironment: (id: string, workspaceId: string) => Promise<void>;
  refreshResolvedVariables: (workspaceId: string) => Promise<void>;
}

export const useEnvironmentsStore = create<EnvironmentsState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  resolvedVariables: [],

  loadEnvironments: async (workspaceId) => {
    const environments = await ipc.environment.list(workspaceId);
    const activeEnv = environments.find((e) => e.is_active);
    set({
      environments,
      activeEnvironmentId: activeEnv?.id ?? null,
    });
    // Also load resolved variables
    await get().refreshResolvedVariables(workspaceId);
  },

  createEnvironment: async (workspaceId, name) => {
    const env = await ipc.environment.create({ workspace_id: workspaceId, name });
    await get().loadEnvironments(workspaceId);
    return env;
  },

  setActive: async (id, workspaceId) => {
    if (id) {
      await ipc.environment.setActive(id, workspaceId);
    } else {
      await ipc.environment.deactivateAll(workspaceId);
    }
    set({ activeEnvironmentId: id });
    await get().refreshResolvedVariables(workspaceId);
  },

  updateEnvironment: async (input) => {
    const updated = await ipc.environment.update(input);
    set((state) => ({
      environments: state.environments.map((e) => (e.id === updated.id ? updated : e)),
    }));
  },

  deleteEnvironment: async (id, workspaceId) => {
    await ipc.environment.delete(id);
    await get().loadEnvironments(workspaceId);
  },

  refreshResolvedVariables: async (workspaceId) => {
    const vars = await ipc.environment.getResolvedVariables(workspaceId);
    set({ resolvedVariables: vars });
  },
}));
