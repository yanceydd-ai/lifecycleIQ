'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createLocation, updateLocation, deleteLocation } from '@/lib/actions/locations';
import type { Location } from '@lifecycleiq/shared';

interface Props { initialData: Location[] }

export function LocationsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [locationType, setLocationType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null); setName(''); setBuilding(''); setRoom(''); setLocationType('');
    setShowForm(true);
  }

  function openEdit(row: Location) {
    setEditing(row); setName(row.name); setBuilding(row.building ?? '');
    setRoom(row.room ?? ''); setLocationType(row.locationType ?? '');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      building: building || undefined,
      room: room || undefined,
      locationType: locationType || undefined,
    };
    startTransition(async () => {
      if (editing) {
        const updated = await updateLocation(editing.id, payload);
        setData((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createLocation(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLocation(id);
      setData((prev) => prev.filter((l) => l.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add Location
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit Location' : 'New Location'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
              <input value={building} onChange={(e) => setBuilding(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <input value={room} onChange={(e) => setRoom(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="w-full rounded-md border-gray-300 text-sm">
                <option value="">—</option>
                <option value="office">Office</option>
                <option value="datacenter">Data Center</option>
                <option value="warehouse">Warehouse</option>
                <option value="remote">Remote</option>
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
          { header: 'Name', accessor: 'name' },
          { header: 'Building', accessor: (r) => r.building ?? '—' },
          { header: 'Room', accessor: (r) => r.room ?? '—' },
          { header: 'Type', accessor: (r) => r.locationType ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
