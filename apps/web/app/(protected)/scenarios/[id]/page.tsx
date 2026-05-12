import { getScenario } from '@/lib/actions/scenarios';
import { getHardwareAssets } from '@/lib/actions/hardware-assets';
import { getSoftwareProducts } from '@/lib/actions/software-products';
import { getContracts } from '@/lib/actions/contracts';
import { ScenarioEditorClient } from './client';

interface Props {
  params: { id: string };
}

export default async function ScenarioEditorPage({ params }: Props) {
  const [scenario, assets, software, contracts] = await Promise.all([
    getScenario(params.id),
    getHardwareAssets(),
    getSoftwareProducts(),
    getContracts(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/scenarios" className="text-sm text-gray-500 hover:text-gray-900">← Scenarios</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-semibold text-gray-900">{scenario.name}</h1>
      </div>
      <ScenarioEditorClient
        scenario={scenario}
        assets={assets}
        software={software}
        contracts={contracts}
      />
    </div>
  );
}
