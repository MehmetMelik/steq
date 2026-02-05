import { cn } from '../../../lib/cn';
import { useSettingsStore } from '../store/settings.store';

export function ModeToggle() {
  const mode = useSettingsStore((s) => s.mode);
  const theme = useSettingsStore((s) => s.theme);
  const toggleMode = useSettingsStore((s) => s.toggleMode);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  return (
    <div className="flex items-center gap-1">
      <button
        data-testid="theme-toggle"
        onClick={toggleTheme}
        className="px-1.5 py-0.5 text-[10px] text-text-muted hover:text-text-primary
                   hover:bg-bg-hover rounded transition-colors"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? 'LGT' : 'DRK'}
      </button>
      <button
        data-testid="mode-toggle"
        onClick={toggleMode}
        className={cn(
          'px-1.5 py-0.5 text-[10px] rounded transition-colors',
          mode === 'hacker'
            ? 'bg-accent/20 text-accent'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
        )}
        title={`Switch to ${mode === 'enterprise' ? 'hacker' : 'enterprise'} mode`}
      >
        {mode === 'hacker' ? 'HKR' : 'ENT'}
      </button>
    </div>
  );
}
