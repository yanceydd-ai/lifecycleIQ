import { ImportsClient } from './client';

export default function ImportsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Import Records</h1>
      </div>
      <ImportsClient />
    </div>
  );
}
