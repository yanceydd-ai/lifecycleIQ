'use client';

import type { CapitalReplacementReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: CapitalReplacementReport }

export function CapitalReplacementClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Capital Replacement by Fiscal Year'],
      ['Fiscal Year', 'Asset', 'Type', 'Cost', 'Location', 'Department'],
    ];
    for (const group of report.byYear) {
      for (const a of group.assets) {
        rows.push([group.fiscalYear, a.name, a.assetType, a.cost, a.location ?? '', a.department ?? '']);
      }
    }
    rows.push([]);
    rows.push(['Risk Items (Expired Warranty or Support)']);
    rows.push(['Asset', 'Tag', 'Criticality', 'Support End', 'Warranty End']);
    for (const r of report.riskItems) {
      rows.push([r.name, r.assetTag ?? '', r.criticality, r.supportEndDate ?? '', r.warrantyEndDate ?? '']);
    }
    downloadCsv(`capital-replacement-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
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

      {report.byYear.length === 0 ? (
        <p className="text-sm text-gray-500">No capital replacements scheduled in the next 7 fiscal years.</p>
      ) : (
        report.byYear.map((group) => (
          <section key={group.fiscalYear}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">FY{group.fiscalYear}</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.assets.map((a, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.assetType}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(a.cost)}</td>
                    <td className="px-4 py-3 text-gray-500">{a.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.department ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Risk Items — Expired Warranty or Support ({report.riskItems.length})
        </h2>
        {report.riskItems.length === 0 ? (
          <p className="text-sm text-gray-500">No assets with expired warranty or support.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tag</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Criticality</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Support End</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Warranty End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.riskItems.map((r, i) => (
                <tr key={i} className={r.criticality === 'mission_critical' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.assetTag ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.criticality.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.supportEndDate ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.warrantyEndDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
