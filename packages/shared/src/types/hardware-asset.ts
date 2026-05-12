export interface HardwareAsset {
  id: string;
  assetTag: string | null;
  assetType: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchaseCost: string | null;
  replacementCost: string | null;
  usefulLifeYears: number | null;
  annualMaintenanceCost: string | null;
  replacementYearOverride: number | null;
  warrantyEndDate: Date | null;
  supportEndDate: Date | null;
  lifecycleStatus: string;
  criticality: string;
  fundingType: string;
  locationId: string | null;
  departmentId: string | null;
  vendorId: string | null;
  assignedUserId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  replacementYear: number | null;
  warrantyExpired: boolean;
  unsupported: boolean;
  highRisk: boolean;
}

export interface CreateHardwareAssetInput {
  assetType: string;
  assetTag?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: string;
  replacementCost?: string;
  usefulLifeYears?: number;
  annualMaintenanceCost?: string;
  replacementYearOverride?: number;
  warrantyEndDate?: string;
  supportEndDate?: string;
  lifecycleStatus?: string;
  criticality?: string;
  fundingType?: string;
  locationId?: string;
  departmentId?: string;
  vendorId?: string;
  assignedUserId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  notes?: string;
}

export interface UpdateHardwareAssetInput extends Partial<CreateHardwareAssetInput> {}
