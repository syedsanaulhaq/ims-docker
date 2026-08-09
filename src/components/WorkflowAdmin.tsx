import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, RefreshCcw, Settings2, Group, CheckCircle2, AlertTriangle, Search, X } from 'lucide-react';

type WorkflowDesignationStep = {
  step_order: number;
  roles: string[];
};

type WorkflowGroupConfig = {
  group_number: number;
  steps: WorkflowDesignationStep[];
};

type GroupCheckerItem = {
  id: string;
  nomenclature: string;
  description: string;
};

type GroupCheckerGroup = {
  group_number: number;
  item_count: number;
  items: GroupCheckerItem[];
};

const GROUP_OPTIONS = [1, 2, 3, 4, 5, 6];
const WORKFLOW_ROLE_NAMES = [
  'AD Admin-I',
  'AD Admin-II',
  'DD Admin',
  'DG Admin',
  'Storekeeper',
  'Transport Supervisor'
];

export const WorkflowAdmin: React.FC = () => {
  const [configs, setConfigs] = useState<WorkflowGroupConfig[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number>(1);
  const [steps, setSteps] = useState<WorkflowDesignationStep[]>([
    { step_order: 1, roles: [] }
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stepSearchTerms, setStepSearchTerms] = useState<Record<number, string>>({});
  const [duplicateSourceGroup, setDuplicateSourceGroup] = useState<number | null>(null);
  const [duplicateTargetGroup, setDuplicateTargetGroup] = useState<number>(1);
  const [editorMode, setEditorMode] = useState<'insert' | 'edit'>('insert');
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);
  const [checkerGroups, setCheckerGroups] = useState<GroupCheckerGroup[]>([]);

  const currentConfig = useMemo(
    () => configs.find((config) => config.group_number === selectedGroup) || null,
    [configs, selectedGroup]
  );

  const sortedConfigs = useMemo(
    () => [...configs].sort((a, b) => a.group_number - b.group_number),
    [configs]
  );

  const normalizeRole = (value: string | { value: string; match_mode?: string }) => {
    if (typeof value === 'string') return value;
    return value?.value || '';
  };

  const filteredRolesForStep = (stepOrder: number) => {
    const term = (stepSearchTerms[stepOrder] || '').toLowerCase().trim();
    const source = availableRoles || [];
    if (!term) return source.slice(0, 12);
    return source.filter((d) => d.toLowerCase().includes(term)).slice(0, 12);
  };

  const formatFlowText = (config: WorkflowGroupConfig) => {
    const orderedSteps = [...(config.steps || [])].sort((a, b) => a.step_order - b.step_order);
    const chain = orderedSteps
      .map((step) => (step.roles || []).filter(Boolean).join(' / '))
      .filter(Boolean)
      .join(' -> ');

    return chain ? `Group ${config.group_number} -> ${chain}` : `Group ${config.group_number}`;
  };

  useEffect(() => {
    void loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configsResponse, rolesResponse] = await Promise.all([
        fetch('http://localhost:3001/api/approvals/workflow/configs', { credentials: 'include' }),
        fetch('http://localhost:3001/api/permissions/roles', { credentials: 'include' })
      ]);

      const configsData = await configsResponse.json();
      const rolesData = await rolesResponse.json();

      if (!configsResponse.ok) {
        throw new Error(configsData.error || 'Failed to load workflow configs');
      }

      if (!rolesResponse.ok) {
        throw new Error(rolesData.error || 'Failed to load workflow roles');
      }

      const normalizedConfigs: WorkflowGroupConfig[] = (configsData.data || []).map((groupConfig: any) => ({
        group_number: Number(groupConfig.group_number),
        steps: (groupConfig.steps || []).map((step: any) => ({
          step_order: Number(step.step_order),
          roles: (step.designations || step.roles || [])
            .map((value: any) => normalizeRole(value))
            .filter(Boolean)
        }))
      }));

      setConfigs(normalizedConfigs);
      const roleRows = Array.isArray(rolesData)
        ? rolesData
        : Array.isArray(rolesData?.roles)
          ? rolesData.roles
          : Array.isArray(rolesData?.data)
            ? rolesData.data
            : [];

      const normalizedRoles = roleRows
        .map((role: any) => String(role?.role_name || role?.name || role || '').trim())
        .filter((roleName: string) => WORKFLOW_ROLE_NAMES.includes(roleName));

      setAvailableRoles(normalizedRoles);
    } catch (err: any) {
      setError(err?.message || 'Failed to load workflow admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateStepRoles = (stepOrder: number, roleName: string, checked: boolean) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.step_order !== stepOrder) return step;

        const existing = new Set(step.roles);
        if (checked) {
          existing.add(roleName);
        } else {
          existing.delete(roleName);
        }

        return {
          ...step,
          roles: Array.from(existing)
        };
      })
    );
  };

  const addStep = () => {
    setSteps((prev) => {
      const nextStepOrder = prev.length > 0 ? Math.max(...prev.map((step) => step.step_order)) + 1 : 1;
      return [...prev, { step_order: nextStepOrder, roles: [] }];
    });
  };

  const removeStep = (stepOrder: number) => {
    setSteps((prev) => {
      const filtered = prev.filter((step) => step.step_order !== stepOrder);
      return filtered.length > 0
        ? filtered.map((step, index) => ({ ...step, step_order: index + 1 }))
        : [{ step_order: 1, roles: [] }];
    });

    setStepSearchTerms((prev) => {
      const next: Record<number, string> = {};
      Object.keys(prev).forEach((key) => {
        const numericKey = Number(key);
        if (numericKey !== stepOrder) {
          next[numericKey] = prev[numericKey];
        }
      });
      return next;
    });
  };

  const saveWorkflow = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        steps: steps
          .filter((step) => step.roles.length > 0)
          .map((step, index) => ({
            step_order: index + 1,
            roles: step.roles
          }))
      };

      if (payload.steps.length === 0) {
        throw new Error('Add at least one role to save the workflow');
      }

      const response = await fetch(`http://localhost:3001/api/approvals/workflow/configs/${selectedGroup}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save workflow');
      }

      setSuccess(`Workflow saved for Group ${selectedGroup}`);
      setEditorMode('insert');
      setSteps([{ step_order: 1, roles: [] }]);
      setStepSearchTerms({});
      await loadWorkflowData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const resetToCurrent = () => {
    if (editorMode === 'edit' && currentConfig) {
      setSteps(currentConfig.steps.map((step) => ({
        step_order: step.step_order,
        roles: [...step.roles]
      })));
    } else {
      setSteps([{ step_order: 1, roles: [] }]);
    }
    setError(null);
    setSuccess(null);
    setStepSearchTerms({});
  };

  const editWorkflowGroup = (groupNumber: number) => {
    const config = configs.find((item) => item.group_number === groupNumber) || null;
    setSelectedGroup(groupNumber);
    setEditorMode('edit');
    if (config?.steps?.length) {
      setSteps(config.steps.map((step) => ({
        step_order: step.step_order,
        roles: [...step.roles]
      })));
    } else {
      setSteps([{ step_order: 1, roles: [] }]);
    }
    setStepSearchTerms({});
    setError(null);
    setSuccess(`Editing Group ${groupNumber}`);
  };

  const deleteWorkflowGroup = async (groupNumber: number) => {
    const confirmed = window.confirm(`Delete workflow for Group ${groupNumber}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`http://localhost:3001/api/approvals/workflow/configs/${groupNumber}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete workflow');
      }

      if (selectedGroup === groupNumber) {
        setSteps([{ step_order: 1, roles: [] }]);
      }

      setSuccess(`Workflow deleted for Group ${groupNumber}`);
      await loadWorkflowData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete workflow');
    } finally {
      setSaving(false);
    }
  };

  const openDuplicateDialog = (sourceGroupNumber: number) => {
    const defaultTarget = GROUP_OPTIONS.find((group) => group !== sourceGroupNumber) || 1;
    setDuplicateSourceGroup(sourceGroupNumber);
    setDuplicateTargetGroup(defaultTarget);
    setError(null);
  };

  const closeDuplicateDialog = () => {
    setDuplicateSourceGroup(null);
  };

  const duplicateWorkflowGroup = async () => {
    if (!duplicateSourceGroup) return;

    const sourceGroupNumber = duplicateSourceGroup;
    const sourceConfig = configs.find((config) => config.group_number === sourceGroupNumber);
    if (!sourceConfig || !sourceConfig.steps?.length) {
      setError(`No workflow found to duplicate for Group ${sourceGroupNumber}`);
      return;
    }

    const targetGroup = Number(duplicateTargetGroup);
    if (!Number.isInteger(targetGroup) || targetGroup < 1 || targetGroup > 6) {
      setError('Please enter a valid target group number between 1 and 6');
      return;
    }

    if (targetGroup === sourceGroupNumber) {
      setError('Source and target group cannot be the same for duplication');
      return;
    }

    const payload = {
      steps: sourceConfig.steps
        .filter((step) => step.roles.length > 0)
        .map((step, index) => ({
          step_order: index + 1,
          roles: [...step.roles]
        }))
    };

    if (payload.steps.length === 0) {
      setError(`No steps available to duplicate from Group ${sourceGroupNumber}`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`http://localhost:3001/api/approvals/workflow/configs/${targetGroup}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate workflow');
      }

      setSuccess(`Workflow duplicated: Group ${sourceGroupNumber} -> Group ${targetGroup}`);
      setSelectedGroup(targetGroup);
      closeDuplicateDialog();
      await loadWorkflowData();
    } catch (err: any) {
      setError(err?.message || 'Failed to duplicate workflow');
    } finally {
      setSaving(false);
    }
  };

  const loadGroupCheckerData = async () => {
    try {
      setCheckerLoading(true);
      setCheckerError(null);

      const response = await fetch('http://localhost:3001/api/approvals/workflow/group-items', {
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load group checker data');
      }

      const normalized: GroupCheckerGroup[] = Array.isArray(data?.data)
        ? data.data.map((group: any) => ({
          group_number: Number(group.group_number),
          item_count: Number(group.item_count || 0),
          items: Array.isArray(group.items)
            ? group.items.map((item: any) => ({
              id: String(item.id || ''),
              nomenclature: String(item.nomenclature || 'Unnamed Item'),
              description: String(item.description || '')
            }))
            : []
        }))
        : [];

      setCheckerGroups(normalized);
    } catch (err: any) {
      setCheckerError(err?.message || 'Failed to load group checker data');
      setCheckerGroups([]);
    } finally {
      setCheckerLoading(false);
    }
  };

  const openGroupChecker = async () => {
    setCheckerOpen(true);
    await loadGroupCheckerData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-700 mb-4">
            <Settings2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="text-slate-700 font-medium">Loading workflow administration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflow Configuration</h1>
              <p className="mt-1 text-sm text-gray-600">
                Select group, then add step rows with searchable multi-select workflow roles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openGroupChecker}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Group className="h-4 w-4" />
                Group Checker
              </button>
              <button
                type="button"
                onClick={loadWorkflowData}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={resetToCurrent}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={saveWorkflow}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {duplicateSourceGroup && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-amber-900">
              Duplicate Group {duplicateSourceGroup} Workflow
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-amber-900">Target Group</label>
                <select
                  value={duplicateTargetGroup}
                  onChange={(e) => setDuplicateTargetGroup(Number(e.target.value))}
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                >
                  {GROUP_OPTIONS.filter((group) => group !== duplicateSourceGroup).map((group) => (
                    <option key={group} value={group}>
                      Group {group}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={closeDuplicateDialog}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={duplicateWorkflowGroup}
                  disabled={saving}
                  className="rounded-md border border-amber-300 bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {saving ? 'Duplicating...' : 'Confirm Duplicate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {checkerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Group Item Checker</h3>
                  <p className="text-sm text-gray-600">Review items in each group before assigning workflow roles.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadGroupCheckerData}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckerOpen(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-5">
                {checkerLoading && (
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Loading group items...
                  </div>
                )}

                {!checkerLoading && checkerError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {checkerError}
                  </div>
                )}

                {!checkerLoading && !checkerError && (
                  <div className="space-y-4">
                    {checkerGroups.map((group) => (
                      <div key={`group-checker-${group.group_number}`} className="rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">Group {group.group_number}</div>
                          <div className="text-xs font-medium text-gray-600">{group.item_count} item(s)</div>
                        </div>
                        {group.items.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No mapped items found for this group.</div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-white sticky top-0">
                                <tr>
                                  <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Nomenclature</th>
                                  <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((item) => (
                                  <tr key={`${group.group_number}-${item.id}`}>
                                    <td className="border-b border-gray-100 px-3 py-2 text-gray-900">{item.nomenclature}</td>
                                    <td className="border-b border-gray-100 px-3 py-2 text-gray-700">{item.description || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Saved Workflows</h2>
            <span className="text-sm text-gray-600">{sortedConfigs.length} configured group(s)</span>
          </div>

          {sortedConfigs.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No workflows saved yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Group</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Flow</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedConfigs.map((config) => (
                    <tr key={config.group_number}>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-900">Group {config.group_number}</td>
                      <td className="border-b border-gray-100 px-3 py-2 text-gray-700">{formatFlowText(config)}</td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editWorkflowGroup(config.group_number)}
                            className="rounded-md border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDuplicateDialog(config.group_number)}
                            disabled={saving}
                            className="rounded-md border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteWorkflowGroup(config.group_number)}
                            disabled={saving}
                            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(Number(e.target.value));
                  setEditorMode('insert');
                  setSteps([{ step_order: 1, roles: [] }]);
                  setStepSearchTerms({});
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>
                    Group {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 text-sm text-gray-600">
              Current saved workflow:
              <span className="ml-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                {currentConfig ? `${currentConfig.steps.length} step(s) configured` : 'No workflow configured'}
              </span>
              <span className="ml-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                Mode: {editorMode === 'edit' ? 'Edit' : 'Insert (Blank)'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Steps</h2>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.step_order} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Step {step.step_order}</div>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(step.step_order)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Search Roles</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={stepSearchTerms[step.step_order] || ''}
                      onChange={(e) =>
                        setStepSearchTerms((prev) => ({
                          ...prev,
                          [step.step_order]: e.target.value
                        }))
                      }
                      placeholder="Type to search role"
                      className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {filteredRolesForStep(step.step_order).map((roleName) => {
                      const checked = step.roles.includes(roleName);
                      return (
                        <label key={`${step.step_order}-${roleName}`} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-white">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => updateStepRoles(step.step_order, roleName, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm text-gray-800">{roleName}</span>
                        </label>
                      );
                    })}
                    {filteredRolesForStep(step.step_order).length === 0 && (
                      <div className="px-2 py-2 text-sm text-gray-500">No role found</div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {step.roles.map((roleName) => (
                    <span
                      key={`${step.step_order}-selected-${roleName}`}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                    >
                      {roleName}
                      <button
                        type="button"
                        onClick={() => updateStepRoles(step.step_order, roleName, false)}
                        className="rounded-full p-0.5 hover:bg-blue-200"
                        aria-label={`Remove ${roleName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {step.roles.length === 0 && (
                    <span className="text-xs text-gray-500">No roles selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
            <button
              type="button"
              onClick={saveWorkflow}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowAdmin;
