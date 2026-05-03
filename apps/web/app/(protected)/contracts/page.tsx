import { getContracts } from '@/lib/actions/contracts';
import { ContractsClient } from './client';

export default async function ContractsPage() {
  const contracts = await getContracts();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
      </div>
      <ContractsClient initialData={contracts} />
    </div>
  );
}
