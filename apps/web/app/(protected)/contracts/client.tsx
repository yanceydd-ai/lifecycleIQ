'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import {
  createContract,
  updateContract,
  deleteContract,
} from '@/lib/actions/contracts';
import type { Contract } from '@lifecycleiq/shared';

interface Props {
  initialData: Contract[];
}

const CONTRACT_TYPES = [
  'software_subscription',
  'saas_agreement',
  'hardware_support',
  'maintenance_agreement',
  'managed_service',
  'telecom',
  'internet_circuit',
  'cloud_service',
  'professional_service',
  'warranty',
  'other',
];

const APPROVAL_STATUSES = [
  'not_reviewed',
  'review_required',
  'pending_quote',
  'pending_approval',
  'approved',
  'rejected',
  'deferred',
  'cancelled',
];

export function ContractsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  // Form fields
  const [name, setName] = useState('');
  const [contractType, setContractType] = useState(CONTRACT_TYPES[0]);
  const [endDate, setEndDate] = useState('');
  const [noticePeriodDays, setNoticePeriodDays] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [annualCost, setAnnualCost] = useState('');
  const [approvalStatus, setApprovalStatus] = useState(APPROVAL_STATUSES[0]);

  function openCreate() {
    setEditing(null);
    setName('');
    setContractType(CONTRACT_TYPES[0]);
    setEndDate('');
    setNoticePeriodDays('');
    setAutoRenewal(false);
    setAnnualCost('');
    setApprovalStatus(APPROVAL_STATUSES[0]);
    setShowForm(true);
  }

  function openEdit(row: Contract) {
    setEditing(row);
    setName(row.name);
    setContractType(row.contractType ?? CONTRACT_TYPES[0]);
    setEndDate(
      row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : '',
    );
    setNoticePeriodDays(row.noticePeriodDays?.toString() ?? '');
    setAutoRenewal(row.autoRenewal);
    setAnnualCost(row.annualCost ?? '');
    setApprovalStatus(row.approvalStatus ?? APPROVAL_STATUSES[0]);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload: Parameters<typeof createContract>[0] = {
        name,
        contractType,
        endDate: endDate || undefined,
        noticePeriodDays: noticePeriodDays ? parseInt(noticePeriodDays, 10) : undefined,
        autoRenewal: autoRenewal || undefined,
        annualCost: annualCost || undefined,
        approvalStatus: approvalStatus || undefined,
      };
      if (editing) {
        const updated = await updateContract(editing.id, payload);
        setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createContract(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContract(id);
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
          Add Contract
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">
            {editing ? 'Edit Contract' : 'New Contract'}
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
                  Contract Type
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approval Status
                </label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  {APPROVAL_STATUSES.map((s) => (
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
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notice Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Cost
                </label>
                <input
                  value={annualCost}
                  onChange={(e) => setAnnualCost(e.target.value)}
                  className="w-full rounded-md border-gray-300 text-sm"
                  placeholder="e.g. 12000.00"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="autoRenewal"
                  type="checkbox"
                  checked={autoRenewal}
                  onChange={(e) => setAutoRenewal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="autoRenewal" className="text-sm font-medium text-gray-700">
                  Auto Renewal
                </label>
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
          { header: 'Name', accessor: 'name' },
          {
            header: 'Contract Type',
            accessor: (r) => r.contractType.replace(/_/g, ' '),
          },
          {
            header: 'End Date',
            accessor: (r) =>
              r.endDate ? new Date(r.endDate).toLocaleDateString() : '—',
          },
          {
            header: 'Days Until Renewal',
            accessor: (r) =>
              r.daysUntilRenewal !== null ? r.daysUntilRenewal.toString() : '—',
          },
          {
            header: 'Urgency',
            accessor: (r) => {
              if (r.urgency === 'red') {
                return (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                    Urgent
                  </span>
                );
              }
              if (r.urgency === 'amber') {
                return (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                    Soon
                  </span>
                );
              }
              if (r.urgency === 'green') {
                return (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                    OK
                  </span>
                );
              }
              return '—';
            },
          },
          {
            header: 'Annual Cost',
            accessor: (r) => r.annualCost ?? '—',
          },
          { header: 'Approval Status', accessor: 'approvalStatus' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
