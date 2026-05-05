'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import {
  createHardwareAsset,
  updateHardwareAsset,
  deleteHardwareAsset,
} from '@/lib/actions/hardware-assets';
import { exportRecords } from '@/lib/actions/import-export';
import type { HardwareAsset } from '@lifecycleiq/shared';

interface Props {
  initialData: HardwareAsset[];
}

const ASSET_TYPES = [
  'laptop',
  'desktop',
  'server',
  'vm',
  'network_equipment',
  'printer',
  'mobile_device',
  'storage',
  'peripheral',
  'other',
];

const LIFECYCLE_STATUSES = ['active', 'in_storage', 'retired', 'disposed'];

/** Returns a human-readable label for an asset row */
function assetLabel(r: HardwareAsset): string {
  const parts = [r.manufacturer, r.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : r.assetTag ?? r.assetType;
}

export function HardwareAssetsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<HardwareAsset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  // Form fields
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [lifecycleStatus, setLifecycleStatus] = useState('active');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [usefulLifeYears, setUsefulLifeYears] = useState('');

  function openCreate() {
    setEditing(null);
    setManufacturer('');
    setModel('');
    setAssetTag('');
    setAssetType(ASSET_TYPES[0]);
    setLifecycleStatus('active');
    setPurchaseDate('');
    setUsefulLifeYears('');
    setShowForm(true);
  }

  function openEdit(row: HardwareAsset) {
    setEditing(row);
    setManufacturer(row.manufacturer ?? '');
    setModel(row.model ?? '');
    setAssetTag(row.assetTag ?? '');
    setAssetType(row.assetType);
    setLifecycleStatus(row.lifecycleStatus);
    setPurchaseDate(
      row.purchaseDate
        ? new Date(row.purchaseDate).toISOString().split('T')[0]
        : '',
    );
    setUsefulLifeYears(row.usefulLifeYears?.toString() ?? '');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload: Parameters<typeof createHardwareAsset>[0] = {
        assetType,
        manufacturer: manufacturer || undefined,
        model: model || undefined,
        assetTag: assetTag || undefined,
        lifecycleStatus: lifecycleStatus || undefined,
        purchaseDate: purchaseDate || undefined,
        usefulLifeYears: usefulLifeYears ? parseInt(usefulLifeYears, 10) : undefined,
      };
      if (editing) {
        const updated = await updateHardwareAsset(editing.id, payload);
        setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createHardwareAsset(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHardwareAsset(id);
      setData((prev) => prev.filter((d) => d.id !== id));
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportRecords('hardware-assets');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hardware-assets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? 'Downloading…' : '↓ Download CSV'}
        </button>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          Add Asset
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">
            {editing ? 'Edit Asset' : 'New Asset'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Tag
                </label>
                <input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={lifecycleStatus}
                  onChange={(e) => setLifecycleStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {LIFECYCLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Useful Life (years)
                </label>
                <input
                  type="number"
                  min="1"
                  value={usefulLifeYears}
                  onChange={(e) => setUsefulLifeYears(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
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
          {
            header: 'Asset',
            accessor: (r) => (
              <span className="flex items-center gap-2">
                {assetLabel(r)}
                {r.highRisk && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    High Risk
                  </span>
                )}
              </span>
            ),
          },
          { header: 'Asset Tag', accessor: (r) => r.assetTag ?? '—' },
          { header: 'Type', accessor: (r) => r.assetType.replace(/_/g, ' ') },
          { header: 'Status', accessor: 'lifecycleStatus' },
          {
            header: 'Replacement Year',
            accessor: (r) => r.replacementYear?.toString() ?? '—',
          },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
