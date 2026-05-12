import { getRecommendations } from '@/lib/actions/recommendations';
import { DecisionsClient } from './client';

export default async function DecisionsPage() {
  const recommendations = await getRecommendations();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Decisions</h1>
      <DecisionsClient recommendations={recommendations} />
    </div>
  );
}
