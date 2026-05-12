import { getSoftwareOptimizationReport } from '@/lib/actions/reports';
import { SoftwareOptimizationClient } from './client';

export default async function SoftwareOptimizationPage() {
  const report = await getSoftwareOptimizationReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Software Optimization</h1>
        <p className="mt-1 text-sm text-gray-500">Low-utilization products with savings estimates and termination candidates.</p>
      </div>
      <SoftwareOptimizationClient report={report} />
    </div>
  );
}
