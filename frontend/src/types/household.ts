export interface Household {
  id: number;
  name: string;
  address?: string | null;
  ward?: string | null;
  city?: string | null;
  pincode?: string | null;
  is_bulk_generator: boolean;
  is_primary: boolean;
  created_at: string;
}
