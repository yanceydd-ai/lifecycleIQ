'use client';

import type { SoftwareOptimizationReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: SoftwareOptimizationReport }

export function SoftwareOptimizationClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Low Utilization Products'],
      ['Product', 'Utilization %', 'Purchased', 'Used', 'Annual Cost', 'Potential Savings'],
      ...report.lowUtilization.map(s => [
        s.name,
        `${Math.round(s.utilizationRate * 100)}%`,
        s.qtyPurchased,
        s.qtyUsed,
        s.annualCost,
        s.potentialSavings,
      ]),
      [],
      ['Termination Candidates'],
      ['Product', 'Annual Cost', 'Recommended Action', 'Priority Score'],
      ...report.terminationCandidates.map(t => [t.name, t.annualCost, t.action.replace(/_/g, ' '), t.score]),
    ];
    downloadCsv(`software-optimization-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
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

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Low Utilization Products ({report.lowUtilization.length})
        </h2>
        {report.lowUtilization.length === 0 ? (
          <p className="text-sm text-gray-500">No low-utilization software found (threshold: &lt;70%).</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Utilization</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Purchased</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Used</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Potential Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.lowUtilization.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">
                    {Math.round(s.utilizationRate * 100)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.qtyPurchased}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.qtyUsed}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(s.annualCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(s.potentialSavings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Termination Candidates ({report.terminationCandidates.length})
        </h2>
        {report.terminationCandidates.length === 0 ? (
          <p className="text-sm text-gray-500">No termination candidates identified.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recommended Action</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Priority Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.terminationCandidates.map((t, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(t.annualCost)}</td>
                  <td className="px-4 py-3 text-gray-500">{t.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
