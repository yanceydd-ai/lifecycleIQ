import { getScenarios } from '@/lib/actions/scenarios';
import { ScenariosClient } from './client';
import { auth } from '@/auth';

export default async function ScenariosPage() {
  const [scenarios, session] = await Promise.all([getScenarios(), auth()]);
  const userRole = (session?.user as any)?.role as string | undefined;
  const canCreate = userRole === 'admin' || userRole === 'editor';
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Scenarios</h1>
      <ScenariosClient scenarios={scenarios} canCreate={canCreate} />
    </div>
  );
}
