'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type {
  Scenario,
  ScenarioOverride,
  CreateScenarioInput,
  UpdateScenarioInput,
  UpsertScenarioOverrideInput,
  ForecastYear,
} from '@lifecycleiq/shared';

export async function getScenarios(): Promise<Scenario[]> {
  return apiServer('/api/v1/scenarios');
}

export async function getScenario(id: string): Promise<Scenario> {
  return apiServer(`/api/v1/scenarios/${id}`);
}

export async function createScenario(input: CreateScenarioInput): Promise<Scenario> {
  const result = await apiServer<Scenario>('/api/v1/scenarios', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/scenarios');
  return result;
}

export async function updateScenario(id: string, input: UpdateScenarioInput): Promise<Scenario> {
  const result = await apiServer<Scenario>(`/api/v1/scenarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  revalidatePath('/scenarios');
  revalidatePath(`/scenarios/${id}`);
  return result;
}

export async function deleteScenario(id: string): Promise<void> {
  await apiServer(`/api/v1/scenarios/${id}`, { method: 'DELETE' });
  revalidatePath('/scenarios');
}

export async function getScenarioForecast(id: string): Promise<ForecastYear[]> {
  return apiServer(`/api/v1/scenarios/${id}/forecast`);
}

export async function upsertScenarioOverride(
  scenarioId: string,
  input: UpsertScenarioOverrideInput,
): Promise<ScenarioOverride> {
  const result = await apiServer<ScenarioOverride>(`/api/v1/scenarios/${scenarioId}/overrides`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  revalidatePath(`/scenarios/${scenarioId}`);
  return result;
}

export async function deleteScenarioOverride(
  scenarioId: string,
  overrideId: string,
): Promise<void> {
  await apiServer(`/api/v1/scenarios/${scenarioId}/overrides/${overrideId}`, {
    method: 'DELETE',
  });
  revalidatePath(`/scenarios/${scenarioId}`);
}
