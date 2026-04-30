import { getUsers } from '@/lib/actions/users';
import { UsersClient } from './client';

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      </div>
      <UsersClient initialData={users} />
    </div>
  );
}
