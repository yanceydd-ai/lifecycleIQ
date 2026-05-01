export interface Contract {
  id: string;
  name: string;
  vendorId: string | null;
  contractType: string;
  hardwareAssetId: string | null;
  softwareProductId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  renewalDate: Date | null;
  noticePeriodDays: number | null;
  cancellationDeadlineOverride: Date | null;
  autoRenewal: boolean;
  annualCost: string | null;
  renewalCost: string | null;
  escalationPct: string | null;
  approvalStatus: string;
  documentLink: string | null;
  departmentId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  budgetOwner: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  cancellationDeadline: Date | null;
  daysUntilRenewal: number | null;
  urgency: 'red' | 'amber' | 'green' | null;
}

export interface CreateContractInput {
  name: string;
  contractType: string;
  vendorId?: string;
  hardwareAssetId?: string;
  softwareProductId?: string;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  noticePeriodDays?: number;
  cancellationDeadlineOverride?: string;
  autoRenewal?: boolean;
  annualCost?: string;
  renewalCost?: string;
  escalationPct?: string;
  approvalStatus?: string;
  documentLink?: string;
  departmentId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  notes?: string;
}

export interface UpdateContractInput extends Partial<CreateContractInput> {}
