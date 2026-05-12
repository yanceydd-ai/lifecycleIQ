'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { overrideRecommendation, getDecisionHistory } from '@/lib/actions/recommendations';
import type { Recommendation, DecisionHistory, RecommendedActionType, UpdateRecommendationInput } from '@lifecycleiq/shared';

type Tab = 'all' | 'hardware_asset' | 'software_product' | 'contract';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hardware_asset', label: 'Hardware' },
  { key: 'software_product', label: 'Software' },
  { key: 'contract', label: 'Contracts' },
];

const ACTION_OPTIONS: { value: RecommendedActionType; label: string }[] = [
  { value: 'renew_as_is', label: 'Renew as-is' },
  { value: 'renew_with_reduction', label: 'Renew with reduction' },
  { value: 'expand', label: 'Expand' },
  { value: 'renegotiate', label: 'Renegotiate' },
  { value: 'replace', label: 'Replace' },
  { value: 'retire', label: 'Retire' },
  { value: 'defer', label: 'Defer' },
  { value: 'consolidate', label: 'Consolidate' },
  { value: 'terminate', label: 'Terminate' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'escalate', label: 'Escalate' },
];

const SCORE_COLORS: Record<string, string> = {
  'Must fund': 'bg-red-100 text-red-700',
  'Strongly recommended': 'bg-orange-100 text-orange-700',
  'Plan carefully': 'bg-yellow-100 text-yellow-700',
  'Optional or defer': 'bg-gray-100 text-gray-600',
  'Retirement candidate': 'bg-gray-100 text-gray-400',
};

interface OverrideDialogProps {
  item: Recommendation;
  onClose: () => void;
}

function OverrideDialog({ item, onClose }: OverrideDialogProps) {
  const router = useRouter();
  const [newAction, setNewAction] = useState<RecommendedActionType>(item.recommendedAction);
  const [rationale, setRationale] = useState('');
  const [history, setHistory] = useState<DecisionHistory[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getDecisionHistory(item.entityType, item.entityId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [item.entityType, item.entityId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rationale.length < 10) return;
    const input: UpdateRecommendationInput = { newAction, rationale };
    setSubmitError(null);
    startTransition(async () => {
      try {
        await overrideRecommendation(item.entityType, item.entityId, input);
        onClose();
        router.refresh();
      } catch {
        setSubmitError('Failed to save override. Please try again.');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Override Recommendation</h2>
        <p className="text-sm text-gray-500 mb-4">{item.entityName}</p>

        <div className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded">
          <span className="font-medium">Computed: </span>
          <span className="capitalize">{item.recommendedAction.replace(/_/g, ' ')}</span>
          <span className="text-gray-400 ml-2">(score: {item.score})</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Action</label>
            <select
              value={newAction}
              onChange={e => {
                const v = e.target.value;
                if (ACTION_OPTIONS.some(o => o.value === v)) {
                  setNewAction(v as RecommendedActionType);
                }
              }}
              className="w-full rounded-md border-gray-300 text-sm"
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rationale <span className="text-gray-400">(min 10 characters)</span>
            </label>
            <textarea
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              rows={3}
              minLength={10}
              required
              className="w-full rounded-md border-gray-300 text-sm"
              placeholder="Explain why you are overriding this recommendation…"
            />
          </div>

          {history && history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {history.length} previous decision{history.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                    <span className="font-medium">{h.previousAction ?? 'none'} → {h.newAction}</span>
                    {': '}{h.rationale}
                  </div>
                ))}
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-600">{submitError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={pending || rationale.length < 10}
              className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Override'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Props {
  recommendations: Recommendation[];
}

export function DecisionsClient({ recommendations }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [overrideItem, setOverrideItem] = useState<Recommendation | null>(null);

  const filtered = activeTab === 'all'
    ? recommendations
    : recommendations.filter(r => r.entityType === activeTab);

  function tabCount(key: Tab): number {
    if (key === 'all') return recommendations.length;
    return recommendations.filter(r => r.entityType === key).length;
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">({tabCount(t.key)})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No recommendations in this category.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Classification</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recommended Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Explanation</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={`${r.entityType}:${r.entityId}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{r.entityName}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono">{r.score}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SCORE_COLORS[r.classification] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {r.isOverridden ? (
                      <>
                        <span className="line-through text-gray-400 mr-1">
                          {r.recommendedAction.replace(/_/g, ' ')}
                        </span>
                        <span className="text-blue-600">
                          {r.overriddenAction?.replace(/_/g, ' ')}
                        </span>
                        <span className="ml-1 text-xs text-blue-400">(overridden)</span>
                      </>
                    ) : (
                      r.recommendedAction.replace(/_/g, ' ')
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                    <span title={r.explanation}>
                      {r.explanation.length > 90 ? r.explanation.slice(0, 87) + '…' : r.explanation}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setOverrideItem(r)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overrideItem && (
        <OverrideDialog
          item={overrideItem}
          onClose={() => setOverrideItem(null)}
        />
      )}
    </div>
  );
}
