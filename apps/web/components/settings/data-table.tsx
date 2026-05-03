'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onDelete?: (id: string) => void;
  onEdit?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onDelete,
  onEdit,
}: DataTableProps<T>) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!onDelete) return;
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.header)}
                className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs"
              >
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-gray-400"
              >
                No records found.
              </td>
            </tr>
          )}
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={String(col.header)} className="px-4 py-3 text-gray-700">
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : String(row[col.accessor] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right space-x-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {deleting === row.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
