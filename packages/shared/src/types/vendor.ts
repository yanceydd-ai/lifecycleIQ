export interface Vendor {
  id: string;
  name: string;
  website: string | null;
  accountRepName: string | null;
  accountRepEmail: string | null;
  supportEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorInput {
  name: string;
  website?: string;
  accountRepName?: string;
  accountRepEmail?: string;
  supportEmail?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  website?: string;
  accountRepName?: string;
  accountRepEmail?: string;
  supportEmail?: string;
  notes?: string;
}
