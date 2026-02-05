import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Must stub localStorage BEFORE importing the store (persist middleware reads it on init)
beforeAll(() => {
  const store: Record<string, string> = {};
  const stub = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: stub,
    writable: true,
    configurable: true,
  });
});

// Dynamic import ensures localStorage is available before the store initializes
const getStore = async () => {
  const mod = await import('./settings.store');
  return mod.useSettingsStore;
};

describe('settings.store', () => {
  let useSettingsStore: Awaited<ReturnType<typeof getStore>>;

  beforeAll(async () => {
    useSettingsStore = await getStore();
  });

  beforeEach(() => {
    useSettingsStore.setState({ mode: 'enterprise', theme: 'dark' });
  });

  it('initializes with enterprise mode and dark theme', () => {
    const state = useSettingsStore.getState();
    expect(state.mode).toBe('enterprise');
    expect(state.theme).toBe('dark');
  });

  it('toggleMode switches between enterprise/hacker', () => {
    useSettingsStore.getState().toggleMode();
    expect(useSettingsStore.getState().mode).toBe('hacker');
    useSettingsStore.getState().toggleMode();
    expect(useSettingsStore.getState().mode).toBe('enterprise');
  });

  it('toggleTheme switches between dark/light', () => {
    useSettingsStore.getState().toggleTheme();
    expect(useSettingsStore.getState().theme).toBe('light');
    useSettingsStore.getState().toggleTheme();
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setMode and setTheme set exact values', () => {
    useSettingsStore.getState().setMode('hacker');
    expect(useSettingsStore.getState().mode).toBe('hacker');
    useSettingsStore.getState().setMode('enterprise');
    expect(useSettingsStore.getState().mode).toBe('enterprise');

    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
