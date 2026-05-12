import { getRenewalReviewReport } from '@/lib/actions/reports';
import { RenewalReviewClient } from './client';

export default async function RenewalReviewPage() {
  const report = await getRenewalReviewReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Renewal Review</h1>
        <p className="mt-1 text-sm text-gray-500">Software and contract renewals due within 120 days, with cancellation deadlines.</p>
      </div>
      <RenewalReviewClient report={report} />
    </div>
  );
}
