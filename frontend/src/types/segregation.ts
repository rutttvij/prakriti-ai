// frontend/src/types/segregation.ts

export interface SegregationLog {
  id: number;
  household_id: number;
  worker_id: number | null;

  // Logical date of the log, e.g. "2025-12-03"
  log_date: string;

  dry_kg: number;
  wet_kg: number;
  reject_kg: number;

  // Simple segregation quality score (0–100)
  segregation_score: number;

  notes?: string | null;
}
