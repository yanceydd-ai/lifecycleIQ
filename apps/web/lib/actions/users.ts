'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { User } from '@lifecycleiq/shared';

export async function getUsers(): Promise<User[]> {
  return apiServer('/api/v1/users');
}

export async function createUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  departmentId?: string;
}): Promise<User> {
  const user = await apiServer<User>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/users');
  return user;
}

export async function updateUser(
  id: string,
  data: { displayName?: string; role?: string; isActive?: boolean },
): Promise<User> {
  const user = await apiServer<User>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/users');
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiServer(`/api/v1/users/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/users');
}
