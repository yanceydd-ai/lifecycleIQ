'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Vendor, CreateVendorInput, UpdateVendorInput } from '@lifecycleiq/shared';

export async function getVendors(): Promise<Vendor[]> {
  return apiServer('/api/v1/vendors');
}

export async function createVendor(data: CreateVendorInput): Promise<Vendor> {
  const vendor = await apiServer<Vendor>('/api/v1/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/vendors');
  return vendor;
}

export async function updateVendor(id: string, data: UpdateVendorInput): Promise<Vendor> {
  const vendor = await apiServer<Vendor>(`/api/v1/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/vendors');
  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  await apiServer(`/api/v1/vendors/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/vendors');
}
