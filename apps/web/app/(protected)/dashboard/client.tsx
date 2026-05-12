'use client';

import { BudgetClient } from '../budget/client';
import type { ForecastYear, Alert, Recommendation, AlertSeverity, RecommendedActionType } from '@lifecycleiq/shared';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

const ENTITY_LABELS: Record<string, string> = {
  hardware_asset: 'Hardware',
  software_product: 'Software',
  contract: 'Contract',
};

type Urgency = AlertSeverity | 'medium';

interface DecisionRow {
  key: string;
  name: string;
  type: string;
  issue: string;
  urgency: Urgency;
  dueDate: string | null;
  action: RecommendedActionType | null;
}

interface Props {
  forecast: ForecastYear[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export function DashboardClient({ forecast, alerts, recommendations }: Props) {
  const currentFY = forecast[0];

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highPriorityRecs = recommendations.filter(r => r.score >= 70).length;

  function formatMoney(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  }

  const scoreToUrgency = (score: number): Urgency =>
    score >= 85 ? 'critical' : score >= 70 ? 'high' : 'medium';

  const alertRows: DecisionRow[] = alerts
    .filter(a => a.severity === 'critical' || a.severity === 'high')
    .map(a => ({
      key: a.id,
      name: a.entityName,
      type: ENTITY_LABELS[a.entityType] ?? a.entityType,
      issue: a.message,
      urgency: a.severity,
      dueDate: a.dueDate,
      action: null,
    }));

  const recRows: DecisionRow[] = recommendations
    .filter(r => r.score >= 50)
    .map(r => ({
      key: `rec-${r.entityType}-${r.entityId}`,
      name: r.entityName,
      type: ENTITY_LABELS[r.entityType] ?? r.entityType,
      issue: r.explanation.length > 80 ? r.explanation.slice(0, 77) + '…' : r.explanation,
      urgency: scoreToUrgency(r.score),
      dueDate: null,
      action: r.recommendedAction,
    }));

  const allRows: DecisionRow[] = [
    ...alertRows.sort((a, b) => (SEVERITY_ORDER[a.urgency] ?? 9) - (SEVERITY_ORDER[b.urgency] ?? 9)),
    ...recRows,
  ].slice(0, 15);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Current FY OpEx', value: currentFY ? formatMoney(currentFY.opex) : '—' },
          { label: 'Current FY CapEx', value: currentFY ? formatMoney(currentFY.capex) : '—' },
          { label: 'Critical Alerts', value: String(criticalAlerts), warn: criticalAlerts > 0 },
          { label: 'High-Priority Items', value: String(highPriorityRecs), warn: highPriorityRecs > 0 },
        ].map(card => (
          <div
            key={card.label}
            className={`bg-white border rounded-lg p-4 ${card.warn ? 'border-orange-300' : 'border-gray-200'}`}
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${card.warn ? 'text-orange-600' : 'text-gray-900'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Upcoming decisions */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming Decisions</h2>
        </div>
        {allRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No urgent items at this time.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Issue</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Urgency</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Due</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRows.map(row => (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900 max-w-[140px] truncate">{row.name}</td>
                  <td className="px-4 py-2 text-gray-500">{row.type}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-[240px] truncate">{row.issue}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[row.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{row.dueDate ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700 capitalize">
                    {row.action?.replace(/_/g, ' ') ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Budget roadmap chart — reuse Phase 3 component */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Budget Roadmap</h2>
        <BudgetClient forecast={forecast} />
      </div>
    </div>
  );
}
