import { getVendors } from '@/lib/actions/vendors';
import { VendorsClient } from './client';

export default async function VendorsPage() {
  const vendors = await getVendors();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
      </div>
      <VendorsClient initialData={vendors} />
    </div>
  );
}
