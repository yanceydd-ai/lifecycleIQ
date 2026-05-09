'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Recommendation, DecisionHistory, UpdateRecommendationInput } from '@lifecycleiq/shared';

export async function getRecommendations(params?: {
  entityType?: string;
  minScore?: number;
}): Promise<Recommendation[]> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.minScore !== undefined) qs.set('minScore', String(params.minScore));
  const query = qs.toString();
  return apiServer(`/api/v1/recommendations${query ? `?${query}` : ''}`);
}

export async function getRecommendation(entityType: string, id: string): Promise<Recommendation> {
  return apiServer(`/api/v1/recommendations/${entityType}/${id}`);
}

export async function overrideRecommendation(
  entityType: string,
  id: string,
  input: UpdateRecommendationInput,
): Promise<DecisionHistory> {
  const result = await apiServer<DecisionHistory>(
    `/api/v1/recommendations/${entityType}/${id}/override`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath('/decisions');
  revalidatePath('/dashboard');
  return result;
}

export async function getDecisionHistory(
  entityType: string,
  id: string,
): Promise<DecisionHistory[]> {
  return apiServer(`/api/v1/recommendations/history/${entityType}/${id}`);
}
