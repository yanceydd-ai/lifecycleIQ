'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createDepartment, updateDepartment, deleteDepartment } from '@/lib/actions/departments';
import type { Department } from '@lifecycleiq/shared';

interface Props { initialData: Department[] }

export function DepartmentsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [budgetCode, setBudgetCode] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setName('');
    setBudgetCode('');
    setShowForm(true);
  }

  function openEdit(row: Department) {
    setEditing(row);
    setName(row.name);
    setBudgetCode(row.budgetCode ?? '');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editing) {
        const updated = await updateDepartment(editing.id, { name, budgetCode: budgetCode || undefined });
        setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createDepartment({ name, budgetCode: budgetCode || undefined });
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDepartment(id);
      setData((prev) => prev.filter((d) => d.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">
            {editing ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
              <input
                value={budgetCode}
                onChange={(e) => setBudgetCode(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Budget Code', accessor: (r) => r.budgetCode ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
