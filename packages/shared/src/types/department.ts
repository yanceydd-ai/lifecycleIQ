export interface Department {
  id: string;
  name: string;
  budgetCode: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentInput {
  name: string;
  budgetCode?: string;
  ownerId?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  budgetCode?: string;
  ownerId?: string;
}
