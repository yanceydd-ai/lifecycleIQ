'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Department, CreateDepartmentInput, UpdateDepartmentInput } from '@lifecycleiq/shared';

export async function getDepartments(): Promise<Department[]> {
  return apiServer('/api/v1/departments');
}

export async function createDepartment(data: CreateDepartmentInput): Promise<Department> {
  const dept = await apiServer<Department>('/api/v1/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/departments');
  return dept;
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput): Promise<Department> {
  const dept = await apiServer<Department>(`/api/v1/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/departments');
  return dept;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiServer(`/api/v1/departments/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/departments');
}
