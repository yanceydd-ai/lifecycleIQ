'use server';

import { auth } from '@/auth';

type ImportModule = 'hardware-assets' | 'software-products' | 'contracts';

export interface ImportPreviewResult {
  totalRows: number;
  validRows: Record<string, string>[];
  invalidRows: {
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
  }[];
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  const token = (session?.user as any)?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function importDryRun(
  formData: FormData,
): Promise<ImportPreviewResult> {
  const module = formData.get('module') as ImportModule;
  const file = formData.get('file') as File;

  const authHeader = await getAuthHeader();

  const apiFormData = new FormData();
  apiFormData.append('file', file);

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/import`,
    {
      method: 'POST',
      headers: authHeader,
      body: apiFormData,
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function importConfirm(
  module: ImportModule,
  rows: Record<string, string>[],
): Promise<{ imported: number }> {
  const authHeader = await getAuthHeader();

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/import/confirm`,
    {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportRecords(module: ImportModule): Promise<string> {
  const authHeader = await getAuthHeader();

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/export`,
    {
      headers: authHeader,
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.text();
}
