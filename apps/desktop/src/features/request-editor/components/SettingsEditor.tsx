import type { RequestSettings } from '@steq/domain';

const inputClass =
  'w-full px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:ring-1 focus:ring-accent';

const labelClass = 'text-xs text-text-secondary font-medium';

interface SettingsEditorProps {
  settings: RequestSettings;
  onChange: (settings: RequestSettings) => void;
}

export function SettingsEditor({ settings, onChange }: SettingsEditorProps) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
        Request Settings
      </div>
      <div className="max-w-md space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Timeout (ms)</label>
          <input
            type="number"
            value={settings.timeout_ms}
            onChange={(e) =>
              onChange({ ...settings, timeout_ms: Math.max(0, parseInt(e.target.value) || 0) })
            }
            placeholder="30000"
            min={0}
            step={1000}
            className={inputClass}
          />
          <p className="text-xs text-text-muted">
            Maximum time to wait for a response. 0 means no timeout.
          </p>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.follow_redirects}
              onChange={(e) =>
                onChange({ ...settings, follow_redirects: e.target.checked })
              }
              className="rounded border-border text-accent focus:ring-accent"
            />
            <span className={labelClass}>Follow Redirects</span>
          </label>
        </div>

        {settings.follow_redirects && (
          <div className="space-y-1">
            <label className={labelClass}>Max Redirects</label>
            <input
              type="number"
              value={settings.max_redirects}
              onChange={(e) =>
                onChange({
                  ...settings,
                  max_redirects: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              placeholder="10"
              min={0}
              max={100}
              className={inputClass}
            />
          </div>
        )}
      </div>
    </div>
  );
}
