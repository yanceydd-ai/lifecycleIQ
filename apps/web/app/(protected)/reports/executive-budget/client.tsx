'use client';

import type { ExecutiveBudgetReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: ExecutiveBudgetReport }

export function ExecutiveBudgetClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Metric', 'Value'],
      ['Current Year OpEx', report.currentYearOpex],
      ['Current Year CapEx', report.currentYearCapex],
      ['3-Year Total', report.threeYearTotal],
      ['7-Year Total', report.sevenYearTotal],
      ['Spike Years', report.spikeYears.join(', ') || 'None'],
      [],
      ['Top Renewals (within 120 days)', '', '', ''],
      ['Name', 'Type', 'Renewal Date', 'Annual Cost'],
      ...report.topRenewals.map(r => [r.name, r.type, r.renewalDate ?? '', r.cost]),
      [],
      ['Top Capital Replacements', '', '', ''],
      ['Name', 'Asset Type', 'Replacement Year', 'Cost'],
      ...report.topCapitalReplacements.map(r => [r.name, r.assetType, r.replacementYear ?? '', r.cost]),
      [],
      ['Savings Opportunities', '', '', ''],
      ['Name', 'Annual Cost', 'Utilization %', 'Potential Savings'],
      ...report.savingsOpportunities.map(s => [s.name, s.annualCost, `${Math.round(s.utilizationRate * 100)}%`, s.potentialSavings]),
      [],
      ['High Priority Recommendations', '', '', ''],
      ['Name', 'Type', 'Action', 'Score', 'Classification'],
      ...report.highPriorityRecommendations.map(r => [r.name, r.entityType, r.action, r.score, r.classification]),
    ];
    const csv = toCsv([], rows);
    downloadCsv(`executive-budget-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700"
        >
          ↓ Download CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Current Year OpEx', value: fmt(report.currentYearOpex) },
          { label: 'Current Year CapEx', value: fmt(report.currentYearCapex) },
          { label: '3-Year Total', value: fmt(report.threeYearTotal) },
          { label: '7-Year Total', value: fmt(report.sevenYearTotal) },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {report.spikeYears.length > 0 && (
        <p className="text-sm text-red-600">⚠ Budget spike years: {report.spikeYears.join(', ')}</p>
      )}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Top Renewals (Next 120 Days)</h2>
        {report.topRenewals.length === 0 ? (
          <p className="text-sm text-gray-500">No renewals due in the next 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topRenewals.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.type}</td>
                  <td className="px-4 py-3 text-gray-500">{r.renewalDate ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Top Capital Replacements</h2>
        {report.topCapitalReplacements.length === 0 ? (
          <p className="text-sm text-gray-500">No capital replacements in the 7-year window.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Replacement FY</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topCapitalReplacements.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.assetType}</td>
                  <td className="px-4 py-3 text-gray-500">{r.replacementYear ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Savings Opportunities</h2>
        {report.savingsOpportunities.length === 0 ? (
          <p className="text-sm text-gray-500">No low-utilization software found.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Utilization</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Potential Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.savingsOpportunities.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{Math.round(s.utilizationRate * 100)}%</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(s.annualCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(s.potentialSavings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">High Priority Recommendations</h2>
        {report.highPriorityRecommendations.length === 0 ? (
          <p className="text-sm text-gray-500">No high-priority items.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.highPriorityRecommendations.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.entityType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.score}</td>
                  <td className="px-4 py-3 text-gray-500">{r.classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
