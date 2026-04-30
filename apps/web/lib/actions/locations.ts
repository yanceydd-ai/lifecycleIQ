'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Location, CreateLocationInput, UpdateLocationInput } from '@lifecycleiq/shared';

export async function getLocations(): Promise<Location[]> {
  return apiServer('/api/v1/locations');
}

export async function createLocation(data: CreateLocationInput): Promise<Location> {
  const loc = await apiServer<Location>('/api/v1/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/locations');
  return loc;
}

export async function updateLocation(id: string, data: UpdateLocationInput): Promise<Location> {
  const loc = await apiServer<Location>(`/api/v1/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/locations');
  return loc;
}

export async function deleteLocation(id: string): Promise<void> {
  await apiServer(`/api/v1/locations/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/locations');
}
