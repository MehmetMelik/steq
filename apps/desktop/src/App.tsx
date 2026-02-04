import { cn } from './lib/cn';
import { AppShell } from './components/layout/AppShell';
import { useSettingsStore } from './features/settings/store/settings.store';

function App() {
  const mode = useSettingsStore((s) => s.mode);
  const theme = useSettingsStore((s) => s.theme);

  return (
    <div className={cn(theme === 'light' && 'light-theme', mode === 'hacker' && 'hacker-mode')}>
      <AppShell />
    </div>
  );
}

export default App;
