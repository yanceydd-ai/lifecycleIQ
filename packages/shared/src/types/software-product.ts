export interface SoftwareProduct {
  id: string;
  name: string;
  vendorId: string | null;
  category: string | null;
  description: string | null;
  licenseModel: string | null;
  qtyPurchased: number | null;
  qtyAssigned: number | null;
  qtyActivelyUsed: number | null;
  unitCost: string | null;
  annualCost: string | null;
  billingFrequency: string | null;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  renewalDate: Date | null;
  noticePeriodDays: number | null;
  autoRenewal: boolean;
  status: string;
  recommendedAction: string | null;
  fundingType: string;
  departmentId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  budgetOwner: string | null;
  strategicValue: string | null;
  riskIfNotRenewed: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  utilizationRate: number | null;
  unusedLicenses: number | null;
  potentialSavings: number | null;
  lowUtilization: boolean;
}

export interface CreateSoftwareProductInput {
  name: string;
  vendorId?: string;
  category?: string;
  description?: string;
  licenseModel?: string;
  qtyPurchased?: number;
  qtyAssigned?: number;
  qtyActivelyUsed?: number;
  unitCost?: string;
  annualCost?: string;
  billingFrequency?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  renewalDate?: string;
  noticePeriodDays?: number;
  autoRenewal?: boolean;
  status?: string;
  recommendedAction?: string;
  fundingType?: string;
  departmentId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  strategicValue?: string;
  riskIfNotRenewed?: string;
  notes?: string;
}

export interface UpdateSoftwareProductInput extends Partial<CreateSoftwareProductInput> {}
