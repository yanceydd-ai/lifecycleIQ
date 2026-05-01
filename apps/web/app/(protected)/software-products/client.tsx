'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import {
  createSoftwareProduct,
  updateSoftwareProduct,
  deleteSoftwareProduct,
} from '@/lib/actions/software-products';
import type { SoftwareProduct } from '@lifecycleiq/shared';

interface Props {
  initialData: SoftwareProduct[];
}

const LICENSE_MODELS = [
  'per_user',
  'site_license',
  'concurrent',
  'device',
  'open_source',
  'other',
];

const STATUSES = ['active', 'under_review', 'renewal_pending', 'terminated'];

export function SoftwareProductsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<SoftwareProduct | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  // Form fields
  const [name, setName] = useState('');
  const [licenseModel, setLicenseModel] = useState(LICENSE_MODELS[0]);
  const [qtyPurchased, setQtyPurchased] = useState('');
  const [qtyActivelyUsed, setQtyActivelyUsed] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [annualCost, setAnnualCost] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [status, setStatus] = useState('active');

  function openCreate() {
    setEditing(null);
    setName('');
    setLicenseModel(LICENSE_MODELS[0]);
    setQtyPurchased('');
    setQtyActivelyUsed('');
    setUnitCost('');
    setAnnualCost('');
    setRenewalDate('');
    setStatus('active');
    setShowForm(true);
  }

  function openEdit(row: SoftwareProduct) {
    setEditing(row);
    setName(row.name);
    setLicenseModel(row.licenseModel ?? LICENSE_MODELS[0]);
    setQtyPurchased(row.qtyPurchased?.toString() ?? '');
    setQtyActivelyUsed(row.qtyActivelyUsed?.toString() ?? '');
    setUnitCost(row.unitCost ?? '');
    setAnnualCost(row.annualCost ?? '');
    setRenewalDate(
      row.renewalDate
        ? new Date(row.renewalDate).toISOString().split('T')[0]
        : '',
    );
    setStatus(row.status);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload: Parameters<typeof createSoftwareProduct>[0] = {
        name,
        licenseModel: licenseModel || undefined,
        qtyPurchased: qtyPurchased ? parseInt(qtyPurchased, 10) : undefined,
        qtyActivelyUsed: qtyActivelyUsed ? parseInt(qtyActivelyUsed, 10) : undefined,
        unitCost: unitCost || undefined,
        annualCost: annualCost || undefined,
        renewalDate: renewalDate || undefined,
        status: status || undefined,
      };
      if (editing) {
        const updated = await updateSoftwareProduct(editing.id, payload);
        setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createSoftwareProduct(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSoftwareProduct(id);
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
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">
            {editing ? 'Edit Product' : 'New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Model
                </label>
                <select
                  value={licenseModel}
                  onChange={(e) => setLicenseModel(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {LICENSE_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Licenses Purchased
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtyPurchased}
                  onChange={(e) => setQtyPurchased(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actively Used
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtyActivelyUsed}
                  onChange={(e) => setQtyActivelyUsed(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost
                </label>
                <input
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                  placeholder="e.g. 10.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Cost
                </label>
                <input
                  value={annualCost}
                  onChange={(e) => setAnnualCost(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                  placeholder="e.g. 1200.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Renewal Date
              </label>
              <input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
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
          {
            header: 'License Model',
            accessor: (r) => r.licenseModel?.replace(/_/g, ' ') ?? '—',
          },
          {
            header: 'Licenses Purchased',
            accessor: (r) => r.qtyPurchased?.toString() ?? '—',
          },
          {
            header: 'Utilization Rate',
            accessor: (r) => (
              <span className="flex items-center gap-2">
                {r.utilizationRate !== null
                  ? (r.utilizationRate * 100).toFixed(0) + '%'
                  : '—'}
                {r.lowUtilization && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                    Low Use
                  </span>
                )}
              </span>
            ),
          },
          {
            header: 'Annual Cost',
            accessor: (r) => r.annualCost ?? '—',
          },
          { header: 'Status', accessor: 'status' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
