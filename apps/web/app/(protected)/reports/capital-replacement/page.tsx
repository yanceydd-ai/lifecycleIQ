import { getCapitalReplacementReport } from '@/lib/actions/reports';
import { CapitalReplacementClient } from './client';

export default async function CapitalReplacementPage() {
  const report = await getCapitalReplacementReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Capital Replacement</h1>
        <p className="mt-1 text-sm text-gray-500">Hardware assets grouped by replacement fiscal year, plus assets with expired warranty or support.</p>
      </div>
      <CapitalReplacementClient report={report} />
    </div>
  );
}
