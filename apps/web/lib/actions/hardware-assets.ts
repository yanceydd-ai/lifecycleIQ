'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { HardwareAsset, CreateHardwareAssetInput, UpdateHardwareAssetInput } from '@lifecycleiq/shared';

export async function getHardwareAssets(): Promise<HardwareAsset[]> {
  return apiServer('/api/v1/hardware-assets');
}

export async function getHardwareAsset(id: string): Promise<HardwareAsset> {
  return apiServer(`/api/v1/hardware-assets/${id}`);
}

export async function createHardwareAsset(data: CreateHardwareAssetInput): Promise<HardwareAsset> {
  const asset = await apiServer<HardwareAsset>('/api/v1/hardware-assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/hardware-assets');
  return asset;
}

export async function updateHardwareAsset(id: string, data: UpdateHardwareAssetInput): Promise<HardwareAsset> {
  const asset = await apiServer<HardwareAsset>(`/api/v1/hardware-assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/hardware-assets');
  return asset;
}

export async function deleteHardwareAsset(id: string): Promise<void> {
  await apiServer(`/api/v1/hardware-assets/${id}`, { method: 'DELETE' });
  revalidatePath('/hardware-assets');
}
