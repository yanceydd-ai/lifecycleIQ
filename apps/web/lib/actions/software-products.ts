'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { SoftwareProduct, CreateSoftwareProductInput, UpdateSoftwareProductInput } from '@lifecycleiq/shared';

export async function getSoftwareProducts(): Promise<SoftwareProduct[]> {
  return apiServer('/api/v1/software-products');
}

export async function getSoftwareProduct(id: string): Promise<SoftwareProduct> {
  return apiServer(`/api/v1/software-products/${id}`);
}

export async function createSoftwareProduct(data: CreateSoftwareProductInput): Promise<SoftwareProduct> {
  const product = await apiServer<SoftwareProduct>('/api/v1/software-products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/software-products');
  return product;
}

export async function updateSoftwareProduct(id: string, data: UpdateSoftwareProductInput): Promise<SoftwareProduct> {
  const product = await apiServer<SoftwareProduct>(`/api/v1/software-products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/software-products');
  return product;
}

export async function deleteSoftwareProduct(id: string): Promise<void> {
  await apiServer(`/api/v1/software-products/${id}`, { method: 'DELETE' });
  revalidatePath('/software-products');
}
