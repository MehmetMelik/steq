import { useState, useEffect } from 'react';
import { cn } from '../../../lib/cn';
import { useEnvironmentsStore } from '../store/environments.store';
import type { Variable } from '@steq/domain';

interface EnvironmentEditorProps {
  workspaceId: string;
  onClose: () => void;
}

export function EnvironmentEditor({ workspaceId, onClose }: EnvironmentEditorProps) {
  const environments = useEnvironmentsStore((s) => s.environments);
  const createEnvironment = useEnvironmentsStore((s) => s.createEnvironment);
  const updateEnvironment = useEnvironmentsStore((s) => s.updateEnvironment);
  const deleteEnvironment = useEnvironmentsStore((s) => s.deleteEnvironment);
  const refreshResolvedVariables = useEnvironmentsStore((s) => s.refreshResolvedVariables);

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    environments[0]?.id ?? null,
  );
  const [editName, setEditName] = useState('');
  const [editVariables, setEditVariables] = useState<Variable[]>([]);
  const [dirty, setDirty] = useState(false);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  useEffect(() => {
    if (selectedEnv) {
      setEditName(selectedEnv.name);
      setEditVariables([
        ...selectedEnv.variables,
        emptyVariable(selectedEnv.id),
      ]);
      setDirty(false);
    }
  }, [selectedEnvId, selectedEnv?.updated_at]);

  const handleCreate = async () => {
    const env = await createEnvironment(workspaceId, 'New Environment');
    setSelectedEnvId(env.id);
  };

  const handleSave = async () => {
    if (!selectedEnvId) return;
    const filteredVars = editVariables.filter((v) => v.key.trim() !== '');
    await updateEnvironment({
      id: selectedEnvId,
      name: editName,
      variables: filteredVars,
    });
    setDirty(false);
    await refreshResolvedVariables(workspaceId);
  };

  const handleDelete = async () => {
    if (!selectedEnvId) return;
    await deleteEnvironment(selectedEnvId, workspaceId);
    setSelectedEnvId(environments.find((e) => e.id !== selectedEnvId)?.id ?? null);
  };

  const updateVariable = (index: number, partial: Partial<Variable>) => {
    setEditVariables((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...partial };
      // Auto-add empty row if editing last row
      const lastIdx = updated.length - 1;
      if (index === lastIdx && (partial.key || partial.value)) {
        updated.push(emptyVariable(selectedEnvId ?? ''));
      }
      return updated;
    });
    setDirty(true);
  };

  const removeVariable = (index: number) => {
    setEditVariables((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-primary border border-border rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Manage Environments</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted
                       hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Env list sidebar */}
          <div className="w-44 border-r border-border flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto py-1">
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs transition-colors truncate',
                    selectedEnvId === env.id
                      ? 'bg-bg-hover text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-bg-hover',
                  )}
                >
                  {env.name}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <button
                onClick={handleCreate}
                className="w-full py-1 text-xs text-accent hover:bg-bg-hover rounded transition-colors"
              >
                + New Environment
              </button>
            </div>
          </div>

          {/* Variable editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedEnv ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setDirty(true);
                    }}
                    className="flex-1 text-sm bg-transparent border-none text-text-primary
                               focus:outline-none placeholder:text-text-muted"
                    placeholder="Environment name"
                  />
                  <button
                    onClick={handleDelete}
                    className="px-2 py-1 text-xs text-error hover:bg-bg-hover rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border">
                        <th className="pb-1 pr-2 w-8">On</th>
                        <th className="pb-1 pr-2">Key</th>
                        <th className="pb-1 pr-2">Value</th>
                        <th className="pb-1 pr-2 w-14">Secret</th>
                        <th className="pb-1 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {editVariables.map((v, i) => (
                        <tr key={v.id || `new-${i}`} className="group">
                          <td className="py-0.5 pr-2">
                            <input
                              type="checkbox"
                              checked={v.enabled}
                              onChange={(e) => updateVariable(i, { enabled: e.target.checked })}
                              className="accent-accent"
                            />
                          </td>
                          <td className="py-0.5 pr-2">
                            <input
                              type="text"
                              value={v.key}
                              onChange={(e) => updateVariable(i, { key: e.target.value })}
                              className="w-full bg-transparent border border-transparent
                                         focus:border-border rounded px-1 py-0.5
                                         text-text-primary placeholder:text-text-muted focus:outline-none"
                              placeholder="key"
                            />
                          </td>
                          <td className="py-0.5 pr-2">
                            <input
                              type={v.is_secret ? 'password' : 'text'}
                              value={v.value}
                              onChange={(e) => updateVariable(i, { value: e.target.value })}
                              className="w-full bg-transparent border border-transparent
                                         focus:border-border rounded px-1 py-0.5
                                         text-text-primary placeholder:text-text-muted focus:outline-none"
                              placeholder="value"
                            />
                          </td>
                          <td className="py-0.5 pr-2 text-center">
                            <input
                              type="checkbox"
                              checked={v.is_secret}
                              onChange={(e) => updateVariable(i, { is_secret: e.target.checked })}
                              className="accent-accent"
                            />
                          </td>
                          <td className="py-0.5">
                            {v.key.trim() !== '' && (
                              <button
                                onClick={() => removeVariable(i)}
                                className="w-5 h-5 flex items-center justify-center rounded
                                           text-text-muted hover:text-error hover:bg-bg-hover
                                           opacity-0 group-hover:opacity-100 transition-all"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border">
                  {dirty && (
                    <span className="text-xs text-warning mr-auto">Unsaved changes</span>
                  )}
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover
                               rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!dirty}
                    className={cn(
                      'px-3 py-1.5 text-xs rounded transition-colors',
                      dirty
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-bg-hover text-text-muted cursor-not-allowed',
                    )}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Select or create an environment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyVariable(environmentId: string): Variable {
  return {
    id: '',
    environment_id: environmentId,
    key: '',
    value: '',
    is_secret: false,
    enabled: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  };
}
