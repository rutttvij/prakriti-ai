// frontend/src/types/wasteReport.ts

export type WasteReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface WasteReport {
  id: number;
  public_id?: string | null;

  reporter_id: number;
  image_path?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Link to a household / site, if known
  household_id?: number | null;

  // AI classification snapshot saved with the report
  classification_label?: string | null;
  classification_confidence?: number | null;
  classification_recyclable?: boolean | null;

  status: WasteReportStatus;
  created_at: string;
  updated_at: string;
  assigned_worker_id?: number | null;
  resolved_at?: string | null;
}
