import Link from 'next/link';

const REPORTS = [
  {
    href: '/reports/executive-budget',
    title: 'Executive Budget Summary',
    description: 'Current-year OpEx/CapEx, 7-year forecast totals, top renewals, capital replacements, and high-priority recommendations.',
  },
  {
    href: '/reports/renewal-review',
    title: 'Renewal Review',
    description: 'Software and contract renewals due in the next 120 days, with cancellation deadlines and recommended actions.',
  },
  {
    href: '/reports/capital-replacement',
    title: 'Capital Replacement',
    description: 'Hardware assets grouped by replacement fiscal year, plus assets with expired warranty or support.',
  },
  {
    href: '/reports/software-optimization',
    title: 'Software Optimization',
    description: 'Low-utilization products with savings estimates, and software flagged as termination or retirement candidates.',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live data previews — each report exports to CSV.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-slate-400 hover:shadow-sm transition"
          >
            <h2 className="text-base font-semibold text-gray-900">{r.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{r.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-700">
              View report →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
