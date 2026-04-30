import { auth } from '@/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

export async function apiServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = await auth();
  const token = (session?.user as any)?.accessToken;

  const res = await fetch(`${process.env.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `API error ${res.status}`);
  }

  return res.json();
}
