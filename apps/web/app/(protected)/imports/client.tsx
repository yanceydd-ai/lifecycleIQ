'use client';

import { useState, useTransition } from 'react';
import {
  importDryRun,
  importConfirm,
  type ImportPreviewResult,
} from '@/lib/actions/import-export';

type ImportModule = 'hardware-assets' | 'software-products' | 'contracts';

const MODULES: { value: ImportModule; label: string; template: string }[] = [
  { value: 'hardware-assets', label: 'Hardware Assets', template: '/templates/hardware-assets-template.csv' },
  { value: 'software-products', label: 'Software Products', template: '/templates/software-products-template.csv' },
  { value: 'contracts', label: 'Contracts', template: '/templates/contracts-template.csv' },
];

export function ImportsClient() {
  const [selectedModule, setSelectedModule] = useState<ImportModule>('hardware-assets');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currentModule = MODULES.find((m) => m.value === selectedModule)!;

  function handleModuleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedModule(e.target.value as ImportModule);
    setPreview(null);
    setSuccessCount(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setSuccessCount(null);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('module', selectedModule);
        fd.append('file', file);
        const result = await importDryRun(fd);
        setPreview(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    });
    e.target.value = '';
  }

  function handleConfirm() {
    if (!preview || preview.validRows.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importConfirm(selectedModule, preview.validRows);
        setSuccessCount(result.imported);
        setPreview(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Import failed');
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              value={selectedModule}
              onChange={handleModuleChange}
              className="rounded-md border-gray-300 text-sm"
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="pt-5">
            <a
              href={currentModule.template}
              download
              className="text-sm text-blue-600 hover:underline"
            >
              ↓ Download template CSV
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload CSV file
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {pending ? (
            <p className="text-sm text-gray-500">Validating…</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">Drop your CSV here, or</p>
              <label className="cursor-pointer inline-block px-4 py-2 bg-white border border-gray-300 text-sm rounded-md hover:bg-gray-50">
                Choose file
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">CSV files only</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successCount !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          ✓ Successfully imported {successCount} record{successCount !== 1 ? 's' : ''}.
        </div>
      )}

      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Preview — {preview.totalRows} row{preview.totalRows !== 1 ? 's' : ''}
              </span>
              {preview.validRows.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded">
                  {preview.validRows.length} valid
                </span>
              )}
              {preview.invalidRows.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded">
                  {preview.invalidRows.length} error{preview.invalidRows.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={pending || preview.validRows.length === 0}
              className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50 hover:bg-slate-700"
            >
              {pending ? 'Importing…' : `Import ${preview.validRows.length} record${preview.validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Data</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.validRows.map((row, i) => (
                  <tr key={`v-${i}`} className="bg-green-50 border-b border-green-100">
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {Object.entries(row)
                        .filter(([, v]) => v)
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </td>
                    <td className="px-3 py-1.5 text-green-700 font-medium">✓ Valid</td>
                  </tr>
                ))}
                {preview.invalidRows.map((row) => (
                  <tr key={`e-${row.rowNumber}`} className="bg-red-50 border-b border-red-100">
                    <td className="px-3 py-1.5 text-gray-500">{row.rowNumber}</td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {Object.entries(row.data)
                        .filter(([, v]) => v)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </td>
                    <td className="px-3 py-1.5 text-red-700">
                      ✗ {row.errors.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.invalidRows.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Error rows are skipped. Only valid rows will be imported.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
