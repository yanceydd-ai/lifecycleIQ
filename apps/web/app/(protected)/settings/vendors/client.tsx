'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createVendor, updateVendor, deleteVendor } from '@/lib/actions/vendors';
import type { Vendor } from '@lifecycleiq/shared';

interface Props { initialData: Vendor[] }

export function VendorsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', website: '', accountRepName: '', accountRepEmail: '', supportEmail: '', notes: '' });
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', website: '', accountRepName: '', accountRepEmail: '', supportEmail: '', notes: '' });
    setShowForm(true);
  }

  function openEdit(row: Vendor) {
    setEditing(row);
    setForm({
      name: row.name,
      website: row.website ?? '',
      accountRepName: row.accountRepName ?? '',
      accountRepEmail: row.accountRepEmail ?? '',
      supportEmail: row.supportEmail ?? '',
      notes: row.notes ?? '',
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v || undefined])
    ) as any;
    startTransition(async () => {
      if (editing) {
        const updated = await updateVendor(editing.id, payload);
        setData((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await createVendor(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteVendor(id);
      setData((prev) => prev.filter((v) => v.id !== id));
    });
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-md border-gray-300 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add Vendor
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit Vendor' : 'New Vendor'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            {field('website', 'Website', 'url')}
            {field('accountRepName', 'Account Rep Name')}
            {field('accountRepEmail', 'Account Rep Email', 'email')}
            {field('supportEmail', 'Support Email', 'email')}
            {field('notes', 'Notes')}
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
          { header: 'Name', accessor: 'name' },
          { header: 'Website', accessor: (r) => r.website ?? '—' },
          { header: 'Account Rep', accessor: (r) => r.accountRepName ?? '—' },
          { header: 'Support Email', accessor: (r) => r.supportEmail ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
