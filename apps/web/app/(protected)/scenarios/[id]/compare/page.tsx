import { getScenario, getScenarioForecast } from '@/lib/actions/scenarios';
import { getForecast } from '@/lib/actions/budget';
import { ScenarioCompareClient } from './client';

interface Props {
  params: { id: string };
}

export default async function ScenarioComparePage({ params }: Props) {
  const [scenario, baseline, scenarioForecast] = await Promise.all([
    getScenario(params.id),
    getForecast(),
    getScenarioForecast(params.id),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/scenarios" className="text-sm text-gray-500 hover:text-gray-900">← Scenarios</a>
        <span className="text-gray-300">/</span>
        <a href={`/scenarios/${params.id}`} className="text-sm text-gray-500 hover:text-gray-900">{scenario.name}</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold text-gray-900">Comparison</h1>
      </div>
      <ScenarioCompareClient
        scenarioName={scenario.name}
        escalationRate={Number(scenario.escalationRate)}
        baseline={baseline}
        scenarioForecast={scenarioForecast}
      />
    </div>
  );
}
