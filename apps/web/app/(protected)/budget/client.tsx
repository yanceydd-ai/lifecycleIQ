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

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

interface Props { forecast: ForecastYear[] }

export function BudgetClient({ forecast }: Props) {
  const chartData = forecast.map((y) => ({
    name: `FY${y.fiscalYear}`,
    CapEx: Math.round(y.capex),
    OpEx: Math.round(y.opex),
    isSpike: y.isSpike,
  }));

  const hasSpike = forecast.some((y) => y.isSpike);

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={72} />
            <Tooltip formatter={(value) => (typeof value === 'number' ? formatMoney(value) : value)} />
            <Legend />
            <Bar
              dataKey="CapEx"
              stackId="a"
              fill="#f97316"
              name="CapEx (Replacement)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="OpEx"
              stackId="a"
              fill="#3b82f6"
              name="OpEx (Recurring)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        {hasSpike && (
          <p className="text-xs text-red-600 mt-2">
            ⚠ Spike years exceed 30% above rolling average
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fiscal Year</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">HW Replacement</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">HW Maintenance</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Software</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Contracts</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {forecast.map((y) => (
              <tr key={y.fiscalYear} className={y.isSpike ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 font-medium text-gray-900">FY{y.fiscalYear}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatMoney(y.breakdown.hardwareReplacement)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatMoney(y.breakdown.hardwareMaintenance)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatMoney(y.breakdown.software)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatMoney(y.breakdown.contracts)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(y.total)}</td>
                <td className="px-4 py-3">
                  {y.isSpike && <span className="text-xs text-red-600 font-medium">⚠ Spike</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
