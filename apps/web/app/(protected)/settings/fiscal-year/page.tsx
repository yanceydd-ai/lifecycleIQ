import { getBudgetSettings } from '@/lib/actions/budget';
import { FiscalYearClient } from './client';

export default async function FiscalYearPage() {
  const settings = await getBudgetSettings();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Fiscal Year Settings</h1>
      </div>
      <FiscalYearClient initialSettings={settings} />
    </div>
  );
}
