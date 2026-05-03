'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Contract, CreateContractInput, UpdateContractInput } from '@lifecycleiq/shared';

export async function getContracts(): Promise<Contract[]> {
  return apiServer('/api/v1/contracts');
}

export async function getContract(id: string): Promise<Contract> {
  return apiServer(`/api/v1/contracts/${id}`);
}

export async function createContract(data: CreateContractInput): Promise<Contract> {
  const contract = await apiServer<Contract>('/api/v1/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/contracts');
  return contract;
}

export async function updateContract(id: string, data: UpdateContractInput): Promise<Contract> {
  const contract = await apiServer<Contract>(`/api/v1/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/contracts');
  return contract;
}

export async function deleteContract(id: string): Promise<void> {
  await apiServer(`/api/v1/contracts/${id}`, { method: 'DELETE' });
  revalidatePath('/contracts');
}
