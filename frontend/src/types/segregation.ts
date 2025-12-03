export interface SegregationLog {
  id: number;
  household_id: number;
  worker_id: number | null;

  log_date: string; // ISO date string, e.g. "2025-12-03"
  dry_kg: number;
  wet_kg: number;
  reject_kg: number;

  segregation_score: number; // 0–100
  notes?: string | null;
}
