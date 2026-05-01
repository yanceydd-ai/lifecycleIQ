import { getSoftwareProducts } from '@/lib/actions/software-products';
import { SoftwareProductsClient } from './client';

export default async function SoftwareProductsPage() {
  const products = await getSoftwareProducts();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Software Products</h1>
      </div>
      <SoftwareProductsClient initialData={products} />
    </div>
  );
}
