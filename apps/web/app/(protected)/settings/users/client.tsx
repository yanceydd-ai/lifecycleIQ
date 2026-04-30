'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createUser, updateUser, deleteUser } from '@/lib/actions/users';
import { Role } from '@lifecycleiq/shared';
import type { User } from '@lifecycleiq/shared';

const ROLES = [
  { value: Role.Admin, label: 'Admin' },
  { value: Role.Editor, label: 'Editor' },
  { value: Role.FinanceViewer, label: 'Finance Viewer' },
  { value: Role.DepartmentViewer, label: 'Department Viewer' },
  { value: Role.Viewer, label: 'Viewer' },
];

interface Props { initialData: User[] }

export function UsersClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: Role.Viewer });
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm({ email: '', password: '', displayName: '', role: Role.Viewer });
    setShowForm(true);
  }

  function openEdit(row: User) {
    setEditing(row);
    setForm({ email: row.email, password: '', displayName: row.displayName, role: row.role });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editing) {
        const updated = await updateUser(editing.id, {
          displayName: form.displayName,
          role: form.role,
        });
        setData((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          role: form.role,
        });
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteUser(id);
      setData((prev) => prev.filter((u) => u.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add User
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit User' : 'New User'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input required value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} className="w-full rounded-md border-gray-300 text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'displayName' },
          { header: 'Email', accessor: 'email' },
          { header: 'Role', accessor: 'role' },
          { header: 'Active', accessor: (r) => r.isActive ? 'Yes' : 'No' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
