import { getForecast } from '@/lib/actions/budget';
import { getAlerts } from '@/lib/actions/alerts';
import { getRecommendations } from '@/lib/actions/recommendations';
import { DashboardClient } from './client';

export default async function DashboardPage() {
  const [forecast, alerts, recommendations] = await Promise.all([
    getForecast(),
    getAlerts(),
    getRecommendations(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <DashboardClient forecast={forecast} alerts={alerts} recommendations={recommendations} />
    </div>
  );
}
