import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'enterprise' | 'hacker';
export type AppTheme = 'dark' | 'light';

interface SettingsState {
  mode: AppMode;
  theme: AppTheme;
  setMode: (mode: AppMode) => void;
  setTheme: (theme: AppTheme) => void;
  toggleMode: () => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mode: 'enterprise',
      theme: 'dark',
      setMode: (mode) => set({ mode }),
      setTheme: (theme) => set({ theme }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === 'enterprise' ? 'hacker' : 'enterprise' })),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'steq-settings',
    },
  ),
);
