import { getLocations } from '@/lib/actions/locations';
import { LocationsClient } from './client';

export default async function LocationsPage() {
  const locations = await getLocations();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
      </div>
      <LocationsClient initialData={locations} />
    </div>
  );
}
