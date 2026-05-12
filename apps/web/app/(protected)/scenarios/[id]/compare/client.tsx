'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastYear } from '@lifecycleiq/shared';

function formatAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props {
  scenarioName: string;
  escalationRate: number;
  baseline: ForecastYear[];
  scenarioForecast: ForecastYear[];
}

export function ScenarioCompareClient({ scenarioName, escalationRate, baseline, scenarioForecast }: Props) {
  const chartData = baseline.map((b, i) => {
    const s = scenarioForecast[i];
    return {
      name: `FY${b.fiscalYear}`,
      Baseline: Math.round(b.total),
      [scenarioName]: s ? Math.round(s.total) : 0,
    };
  });

  const baselineTotal = baseline.reduce((sum, y) => sum + y.total, 0);
  const scenarioTotal = scenarioForecast.reduce((sum, y) => sum + y.total, 0);
  const netDiff = scenarioTotal - baselineTotal;
  const netSavings = netDiff < 0;

  return (
    <div className="space-y-8">
      {/* Header callout */}
      <div className="flex items-center gap-6 bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <p className="text-xs text-gray-500">Scenario</p>
          <p className="font-semibold text-gray-900">{scenarioName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Escalation Rate</p>
          <p className="font-semibold text-gray-900">{(escalationRate * 100).toFixed(1)}%</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-500">7-Year Net vs Baseline</p>
          <p className={`text-xl font-semibold ${netSavings ? 'text-green-600' : 'text-red-600'}`}>
            {netSavings ? '−' : '+'}{formatMoney(Math.abs(netDiff))}
          </p>
          <p className="text-xs text-gray-400">{netSavings ? 'savings' : 'additional cost'}</p>
        </div>
      </div>

      {/* Grouped bar chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={72} />
            <Tooltip formatter={(value) => (typeof value === 'number' ? formatMoney(value) : value)} />
            <Legend />
            <Bar dataKey="Baseline" fill="#9ca3af" name="Baseline" radius={[4, 4, 0, 0]} />
            <Bar dataKey={scenarioName} fill="#0d9488" name={scenarioName} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year diff table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fiscal Year</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Baseline</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">{scenarioName}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Difference</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Diff %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {baseline.map((b, i) => {
              const s = scenarioForecast[i];
              const diff = s ? s.total - b.total : 0;
              const pct = b.total > 0 ? (diff / b.total) * 100 : 0;
              const saves = diff < 0;
              return (
                <tr key={b.fiscalYear} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">FY{b.fiscalYear}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatMoney(b.total)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{s ? formatMoney(s.total) : '—'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${saves ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {diff === 0 ? '—' : `${saves ? '−' : '+'}${formatMoney(Math.abs(diff))}`}
                  </td>
                  <td className={`px-4 py-2 text-right ${saves ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {diff === 0 ? '—' : `${saves ? '−' : '+'}${Math.abs(pct).toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td className="px-4 py-3 font-semibold text-gray-900">7-Year Total</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(baselineTotal)}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(scenarioTotal)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${netSavings ? 'text-green-600' : netDiff > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {netDiff === 0 ? '—' : `${netSavings ? '−' : '+'}${formatMoney(Math.abs(netDiff))}`}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${netSavings ? 'text-green-600' : netDiff > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {netDiff === 0 || baselineTotal === 0 ? '—' : `${netSavings ? '−' : '+'}${Math.abs((netDiff / baselineTotal) * 100).toFixed(1)}%`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
