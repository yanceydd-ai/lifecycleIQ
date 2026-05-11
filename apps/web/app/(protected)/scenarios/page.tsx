import { getScenarios } from '@/lib/actions/scenarios';
import { ScenariosClient } from './client';

export default async function ScenariosPage() {
  const scenarios = await getScenarios();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Scenarios</h1>
      <ScenariosClient scenarios={scenarios} />
    </div>
  );
}
