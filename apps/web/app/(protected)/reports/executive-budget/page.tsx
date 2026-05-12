import { getExecutiveBudgetReport } from '@/lib/actions/reports';
import { ExecutiveBudgetClient } from './client';

export default async function ExecutiveBudgetPage() {
  const report = await getExecutiveBudgetReport();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Executive Budget Summary</h1>
          <p className="mt-1 text-sm text-gray-500">Current-year forecast, top renewals, and priority recommendations.</p>
        </div>
      </div>
      <ExecutiveBudgetClient report={report} />
    </div>
  );
}
