import { getHardwareAssets } from '@/lib/actions/hardware-assets';
import { HardwareAssetsClient } from './client';

export default async function HardwareAssetsPage() {
  const assets = await getHardwareAssets();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hardware Assets</h1>
      </div>
      <HardwareAssetsClient initialData={assets} />
    </div>
  );
}
