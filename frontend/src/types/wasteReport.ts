export type WasteReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface WasteReport {
  id: number;
  public_id?: string | null;       // e.g. "CIT-2-000001", "BULK-5-000003"

  reporter_id: number;
  image_path?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: WasteReportStatus;
  created_at: string;
  updated_at: string;
  assigned_worker_id?: number | null;
  resolved_at?: string | null;
}
