'use client';

import { useState, useTransition } from 'react';
import { updateBudgetSettings } from '@/lib/actions/budget';
import type { FiscalYearSettings } from '@lifecycleiq/shared';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props { initialSettings: FiscalYearSettings }

export function FiscalYearClient({ initialSettings }: Props) {
  const [month, setMonth] = useState(initialSettings.fiscalYearStartMonth);
  const [rate, setRate] = useState(
    (Number(initialSettings.defaultEscalationRate) * 100).toFixed(1),
  );
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateBudgetSettings({
        fiscalYearStartMonth: month,
        defaultEscalationRate: parseFloat(rate) / 100,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiscal Year Start Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="w-full rounded-md border-gray-300 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Escalation Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-md border-gray-300 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Annual cost increase applied to future years (e.g. 3 = 3% per year)
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
