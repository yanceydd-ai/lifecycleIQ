'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createScenario, deleteScenario } from '@/lib/actions/scenarios';
import type { Scenario } from '@lifecycleiq/shared';

const TYPE_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  expected: 'Expected',
  aggressive: 'Aggressive',
  custom: 'Custom',
};

const TYPE_COLORS: Record<string, string> = {
  conservative: 'bg-blue-100 text-blue-700',
  expected: 'bg-green-100 text-green-700',
  aggressive: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700',
};

interface Props {
  scenarios: Scenario[];
  canCreate?: boolean;
}

export function ScenariosClient({ scenarios, canCreate = false }: Props) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('3');
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const scenario = await createScenario({ name: name.trim(), escalationRate: parseFloat(rate) / 100 });
      setShowNew(false);
      setName('');
      setRate('3');
      router.push(`/scenarios/${scenario.id}`);
    });
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteScenario(id);
        router.refresh();
      } catch {
        setDeleteError('Cannot delete this scenario.');
      }
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}</p>
        {canCreate && (
          <button
            onClick={() => setShowNew(true)}
            className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-md"
          >
            + New Scenario
          </button>
        )}
      </div>

      {deleteError && <p className="text-sm text-red-600 mb-3">{deleteError}</p>}

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Scenario Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. 5-year deferral plan"
              className="w-full rounded-md border-gray-300 text-sm"
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-700 mb-1">Escalation (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="w-full rounded-md border-gray-300 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="px-3 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
          >
            {pending ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map(s => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABELS[s.type] ?? s.type}
                  </span>
                  {s.isRecommended && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700">Recommended</span>
                  )}
                  {s.isSystem && <span className="text-gray-400 text-xs">🔒</span>}
                </div>
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-sm text-gray-500">{(Number(s.escalationRate) * 100).toFixed(1)}% escalation</p>
                {s.overrides.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{s.overrides.length} override{s.overrides.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <a
                href={`/scenarios/${s.id}`}
                className="flex-1 text-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit
              </a>
              <a
                href={`/scenarios/${s.id}/compare`}
                className="flex-1 text-center px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md hover:bg-slate-700"
              >
                Compare
              </a>
              {!s.isSystem && (
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={pending}
                  className="px-2 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
