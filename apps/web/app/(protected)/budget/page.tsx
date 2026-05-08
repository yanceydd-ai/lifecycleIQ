import Link from 'next/link';
import { getForecast } from '@/lib/actions/budget';
import { BudgetClient } from './client';

export default async function BudgetPage() {
  const forecast = await getForecast();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Budget Roadmap</h1>
        <Link
          href="/settings/fiscal-year"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Edit fiscal year settings →
        </Link>
      </div>
      <BudgetClient forecast={forecast} />
    </div>
  );
}
