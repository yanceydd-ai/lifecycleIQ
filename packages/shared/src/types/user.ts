import { Role } from '../enums/role.enum';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  departmentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
