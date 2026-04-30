import { getDepartments } from '@/lib/actions/departments';
import { DepartmentsClient } from './client';

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
      </div>
      <DepartmentsClient initialData={departments} />
    </div>
  );
}
