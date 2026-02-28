export type UserRole =
  | "CITIZEN"
  | "BULK_GENERATOR"
  | "BULK_MANAGER"
  | "BULK_STAFF"
  | "WASTE_WORKER"
  | "SUPER_ADMIN";

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
}
