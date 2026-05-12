'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { ForecastYear, FiscalYearSettings, UpdateFiscalYearSettingsInput } from '@lifecycleiq/shared';

export async function getForecast(years = 7): Promise<ForecastYear[]> {
  return apiServer(`/api/v1/budget/forecast?years=${years}`);
}

export async function getBudgetSettings(): Promise<FiscalYearSettings> {
  return apiServer('/api/v1/budget/settings');
}

export async function updateBudgetSettings(
  data: UpdateFiscalYearSettingsInput,
): Promise<FiscalYearSettings> {
  const result = await apiServer<FiscalYearSettings>('/api/v1/budget/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/budget');
  return result;
}
