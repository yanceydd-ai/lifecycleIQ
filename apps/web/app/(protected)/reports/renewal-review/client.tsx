'use client';

import type { RenewalReviewReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: RenewalReviewReport }

export function RenewalReviewClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Upcoming Renewals'],
      ['Name', 'Type', 'Renewal Date', 'Annual Cost', 'Recommended Action', 'Approval Status'],
      ...report.upcomingRenewals.map(r => [r.name, r.type, r.renewalDate, r.cost, r.recommendedAction ?? '', r.approvalStatus ?? '']),
      [],
      ['Cancellation Deadlines'],
      ['Name', 'Deadline', 'Renewal Date', 'Annual Cost'],
      ...report.cancellationDeadlines.map(d => [d.name, d.deadline, d.renewalDate, d.cost]),
    ];
    downloadCsv(`renewal-review-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
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
          Upcoming Renewals ({report.upcomingRenewals.length})
        </h2>
        {report.upcomingRenewals.length === 0 ? (
          <p className="text-sm text-gray-500">No renewals due in the next 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.upcomingRenewals.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.type}</td>
                  <td className="px-4 py-3 text-gray-500">{r.renewalDate}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.recommendedAction?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.approvalStatus?.replace(/_/g, ' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Cancellation Deadlines ({report.cancellationDeadlines.length})
        </h2>
        {report.cancellationDeadlines.length === 0 ? (
          <p className="text-sm text-gray-500">No cancellation deadlines within 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Deadline</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.cancellationDeadlines.map((d, i) => (
                <tr key={i} className="bg-yellow-50">
                  <td className="px-4 py-3 text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 font-medium text-yellow-700">{d.deadline}</td>
                  <td className="px-4 py-3 text-gray-500">{d.renewalDate || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(d.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
