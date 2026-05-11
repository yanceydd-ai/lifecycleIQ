'use client';

import { useState, useTransition } from 'react';
import { upsertScenarioOverride, deleteScenarioOverride } from '@/lib/actions/scenarios';
import type {
  Scenario,
  ScenarioOverride,
  OverrideType,
  HardwareAsset,
  SoftwareProduct,
  Contract,
} from '@lifecycleiq/shared';

type Tab = 'hardware' | 'software' | 'contracts';

interface Props {
  scenario: Scenario;
  assets: HardwareAsset[];
  software: SoftwareProduct[];
  contracts: Contract[];
}

function buildOverrideMap(overrides: ScenarioOverride[]): Map<string, ScenarioOverride> {
  const m = new Map<string, ScenarioOverride>();
  for (const o of overrides) {
    m.set(`${o.entityType}:${o.entityId}:${o.overrideType}`, o);
  }
  return m;
}

export function ScenarioEditorClient({ scenario, assets, software, contracts }: Props) {
  const [tab, setTab] = useState<Tab>('hardware');
  const [overrideMap, setOverrideMap] = useState(() => buildOverrideMap(scenario.overrides));
  const [, startTransition] = useTransition();

  function getOverride(entityType: string, entityId: string, overrideType: OverrideType): string {
    return overrideMap.get(`${entityType}:${entityId}:${overrideType}`)?.value ?? '';
  }

  function handleOverride(entityType: string, entityId: string, overrideType: OverrideType, value: string) {
    if (!value.trim()) {
      const key = `${entityType}:${entityId}:${overrideType}`;
      const existing = overrideMap.get(key);
      if (!existing) return;
      startTransition(async () => {
        await deleteScenarioOverride(scenario.id, existing.id);
        setOverrideMap(prev => { const m = new Map(prev); m.delete(key); return m; });
      });
    } else {
      startTransition(async () => {
        const result = await upsertScenarioOverride(scenario.id, {
          entityType: entityType as 'hardware_asset' | 'software_product' | 'contract',
          entityId,
          overrideType,
          value,
        });
        setOverrideMap(prev => new Map(prev).set(`${entityType}:${entityId}:${overrideType}`, result));
      });
    }
  }

  function handleExcludeToggle(entityType: string, entityId: string, checked: boolean) {
    handleOverride(entityType, entityId, 'exclude', checked ? 'true' : '');
  }

  const isExcluded = (entityType: string, entityId: string) =>
    overrideMap.get(`${entityType}:${entityId}:exclude`)?.value === 'true';

  return (
    <div className="space-y-6">
      {/* Scenario settings header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">Escalation Rate</p>
          <p className="font-semibold text-gray-900">{(Number(scenario.escalationRate) * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Overrides</p>
          <p className="font-semibold text-gray-900">{overrideMap.size}</p>
        </div>
        {scenario.isSystem && <p className="text-xs text-gray-400">System scenario</p>}
        <a href={`/scenarios/${scenario.id}/compare`} className="ml-auto px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md">
          View Comparison →
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['hardware', 'software', 'contracts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 capitalize transition-colors ${
              tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'hardware'
              ? `Hardware (${assets.length})`
              : t === 'software'
              ? `Software (${software.length})`
              : `Contracts (${contracts.length})`}
          </button>
        ))}
      </div>

      {/* Hardware tab */}
      {tab === 'hardware' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Defer to Year</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Override Cost ($)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exclude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map(a => {
                const hasOverride =
                  overrideMap.has(`hardware_asset:${a.id}:defer_year`) ||
                  overrideMap.has(`hardware_asset:${a.id}:cost`) ||
                  isExcluded('hardware_asset', a.id);
                const name = [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id;
                return (
                  <tr key={a.id} className={hasOverride ? 'bg-teal-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 font-medium text-gray-900 max-w-[180px] truncate">{name}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">
                      {a.lifecycleStatus.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="2024"
                        max="2040"
                        placeholder="e.g. 2029"
                        defaultValue={getOverride('hardware_asset', a.id, 'defer_year')}
                        onBlur={e => handleOverride('hardware_asset', a.id, 'defer_year', e.target.value)}
                        className="w-24 rounded border-gray-300 text-sm py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 8000"
                        defaultValue={getOverride('hardware_asset', a.id, 'cost')}
                        onBlur={e => handleOverride('hardware_asset', a.id, 'cost', e.target.value)}
                        className="w-28 rounded border-gray-300 text-sm py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isExcluded('hardware_asset', a.id)}
                        onChange={e => handleExcludeToggle('hardware_asset', a.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Software tab */}
      {tab === 'software' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Override Cost ($)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exclude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {software.map(s => {
                const hasOverride =
                  overrideMap.has(`software_product:${s.id}:cost`) ||
                  isExcluded('software_product', s.id);
                return (
                  <tr key={s.id} className={hasOverride ? 'bg-teal-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 font-medium text-gray-900 max-w-[200px] truncate">{s.name}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">
                      {s.status.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {s.annualCost != null ? `$${Number(s.annualCost).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Override"
                        defaultValue={getOverride('software_product', s.id, 'cost')}
                        onBlur={e => handleOverride('software_product', s.id, 'cost', e.target.value)}
                        className="w-28 rounded border-gray-300 text-sm py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isExcluded('software_product', s.id)}
                        onChange={e => handleExcludeToggle('software_product', s.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Contracts tab */}
      {tab === 'contracts' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Contract</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Override Cost ($)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exclude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map(c => {
                const hasOverride =
                  overrideMap.has(`contract:${c.id}:cost`) ||
                  isExcluded('contract', c.id);
                return (
                  <tr key={c.id} className={hasOverride ? 'bg-teal-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                    <td className="px-4 py-2 text-gray-500 capitalize">
                      {c.contractType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {c.annualCost != null ? `$${Number(c.annualCost).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Override"
                        defaultValue={getOverride('contract', c.id, 'cost')}
                        onBlur={e => handleOverride('contract', c.id, 'cost', e.target.value)}
                        className="w-28 rounded border-gray-300 text-sm py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isExcluded('contract', c.id)}
                        onChange={e => handleExcludeToggle('contract', c.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
