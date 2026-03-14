import axios from "axios";

import type {
  ApiEnvelope,
  AdminContactMessage,
  AdminContactMessageListResponse,
  AdminAnalyticsSummary,
  AdminApproval,
  AdminAuditLog,
  AdminPccSummary,
  AdminPccTransactionsResponse,
  BulkGeneratorLogListResponse,
  CitizenSegregationLogListResponse,
  EmissionFactorItem,
  PccActionResponse,
  PccBulkAwardResponse,
  PccReferenceType,
  PccSettings,
  AdminWorkforceUser,
  AdminZone,
  CitizenHousehold,
  CitizenPccSummary,
  CitizenBadgeSummary,
  CitizenSegregationLog,
  CitizenSegregationSummary,
  CitizenTrainingModule,
  CitizenTrainingSummary,
  TrainingProgressItem,
  CitizenWasteReport,
  CaseStudy,
  CaseStudyPayload,
  ContentTabType,
  ContactPayload,
  ContactMessageStatus,
  DemoRequest,
  DemoRequestListResponse,
  DemoRequestStatus,
  FAQItem,
  FAQPayload,
  LeadPayload,
  LedgerRow,
  NewsletterPayload,
  Partner,
  PartnerPayload,
  PublicConfig,
  PublicStats,
  PlatformSettings,
  Testimonial,
  TestimonialPayload,
  TrainingLesson,
  TrainingLessonType,
  TrainingModuleAdmin,
  TrainingModuleListResponse,
  TrainingModulePayload,
} from "./types";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000") as string;

const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
    }
    return Promise.reject(error);
  }
);

export interface ContactPayloadLegacy {
  name: string;
  email: string;
  message: string;
}

export const submitContactMessage = (payload: ContactPayloadLegacy) => api.post("/contact", payload);

export const fetchContactMessagesAdmin = (params?: { skip?: number; limit?: number }) =>
  api.get("/contact/admin", { params });

export type CitizenSummary = {
  training: {
    completed_modules: number;
    total_modules: number;
    badges_earned: number;
    next_module_title?: string | null;
  };
  segregation: {
    today_status: "DONE" | "PENDING" | "MISSED" | "UNKNOWN";
    today_score: number | null;
    streak_days: number;
  };
  reports: {
    total: number;
    pending: number;
    resolved: number;
  };
  carbon: {
    co2_saved_kg: number;
    pcc_tokens: number;
  };
};

export const fetchCitizenSummary = () => api.get<CitizenSummary>("/citizen/summary");

export const fetchCitizenHouseholds = async () => {
  const res = await api.get<CitizenHousehold[]>("/citizen/households");
  return res.data;
};

export const createCitizenHousehold = async (payload: {
  name: string;
  city: string;
  ward_zone?: string;
  address?: string;
  pincode?: string;
  make_primary?: boolean;
}) => {
  const res = await api.post<CitizenHousehold>("/citizen/households", payload);
  return res.data;
};

export const updateCitizenHousehold = async (
  householdId: number,
  payload: Partial<{ name: string; city: string; ward_zone: string; address: string; pincode: string }>
) => {
  const res = await api.patch<CitizenHousehold>(`/citizen/households/${householdId}`, payload);
  return res.data;
};

export const linkCitizenHousehold = async (householdId: number) => {
  const res = await api.post<CitizenHousehold>("/citizen/households/link", { household_id: householdId });
  return res.data;
};

export const makeCitizenHouseholdPrimary = async (householdId: number) => {
  const res = await api.post<CitizenHousehold>(`/citizen/households/${householdId}/make-primary`);
  return res.data;
};

export const createCitizenWasteReport = async (payload: {
  description: string;
  household_id?: number;
  file_path: string;
  classification_label: string;
  classification_confidence: number;
  latitude?: number;
  longitude?: number;
}) => {
  const res = await api.post<CitizenWasteReport>("/citizen/reports", payload);
  return res.data;
};

export const classifyWasteFile = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{
    label: string;
    confidence: number;
    file_path: string;
    display_name?: string;
    recyclable?: boolean;
    stream?: string;
    recycle_steps?: string[];
    dispose_steps?: string[];
    do_not?: string[];
    where_to_take?: string[];
    guidance_source?: "label_metadata" | "fallback";
    low_confidence_threshold?: number;
    alternatives?: Array<{
      id: string;
      confidence: number;
      display_name?: string;
      recyclable?: boolean;
      stream?: string;
      recycle_steps?: string[];
      dispose_steps?: string[];
      do_not?: string[];
      where_to_take?: string[];
      guidance_source?: "label_metadata" | "fallback";
      low_confidence_threshold?: number;
    }>;
  }>(
    "/waste/classify-file",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return res.data;
};

export const fetchCitizenWasteReports = async () => {
  const res = await api.get<CitizenWasteReport[]>("/citizen/reports");
  return res.data;
};

export const fetchCitizenWasteReportDetail = async (reportId: number) => {
  const res = await api.get<CitizenWasteReport>(`/citizen/reports/${reportId}`);
  return res.data;
};

export const createCitizenSegregationLog = async (payload: {
  household_id: number;
  log_date?: string;
  dry_kg: number;
  wet_kg: number;
  reject_kg: number;
  evidence_image_url?: string;
}) => {
  const res = await api.post<CitizenSegregationLog>("/citizen/segregation", payload);
  return res.data;
};

export const fetchCitizenSegregationLogs = async (params?: {
  household_id?: number;
  from?: string;
  to?: string;
}) => {
  const res = await api.get<CitizenSegregationLog[]>("/citizen/segregation", { params });
  return res.data;
};

export const fetchCitizenSegregationSummary = async (params?: {
  household_id?: number;
  weeks?: number;
}) => {
  const res = await api.get<CitizenSegregationSummary>("/citizen/segregation/summary", { params });
  return res.data;
};

export const fetchCitizenPccSummary = async () => {
  const res = await api.get<CitizenPccSummary>("/citizen/pcc/summary");
  return res.data;
};

export const fetchCitizenBadgesSummary = async () => {
  const res = await api.get<CitizenBadgeSummary>("/citizen/badges/me");
  return res.data;
};

export const fetchCitizenTrainingModules = async () => {
  const res = await api.get<CitizenTrainingModule[]>("/training/citizen");
  return res.data;
};

export const fetchBulkTrainingModules = async () => {
  const res = await api.get<CitizenTrainingModule[]>("/training/modules", {
    params: { audience: "bulk_generator" },
  });
  return res.data;
};

export const completeCitizenTrainingModule = async (moduleId: number) => {
  const res = await api.post(`/training/${moduleId}/complete`, {});
  return res.data;
};

export const fetchMyTrainingProgress = async () => {
  const res = await api.get<TrainingProgressItem[]>("/training/progress/me");
  return res.data;
};

export const fetchCitizenTrainingSummary = async () => {
  const res = await api.get<CitizenTrainingSummary>("/citizen/training/summary");
  return res.data;
};

export const fetchPublicStats = async () => {
  const res = await api.get("/public/stats");
  const raw = (res.data?.data?.stats ?? res.data?.stats ?? res.data?.data ?? null) as Record<string, unknown> | null;
  if (!raw) return null;

  const num = (v: unknown, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  return {
    total_users: num(raw.total_users ?? raw.users_count),
    total_waste_logs: num(raw.total_waste_logs ?? raw.total_reports ?? raw.resolved_incidents),
    total_verified_actions: num(raw.total_verified_actions ?? raw.verified_actions ?? raw.verified_count),
    total_carbon_saved: num(raw.total_carbon_saved ?? raw.co2_saved ?? raw.carbon_saved_kgco2e),
    total_pcc_issued: num(raw.total_pcc_issued ?? raw.pcc_issued ?? raw.total_pcc),
    avg_resolution_time_hours: num(raw.avg_resolution_time_hours ?? raw.avg_resolution_time ?? raw.avg_resolution_hours),
    open_reports: num(raw.open_reports ?? raw.open_incidents ?? raw.open_count),
  } as PublicStats;
};

export const fetchPublicPartners = async () => {
  const res = await api.get("/public/partners");
  return (res.data?.data?.partners ?? res.data?.partners ?? []) as Partner[];
};

export const fetchPublicTestimonials = async () => {
  const res = await api.get("/public/testimonials");
  return (res.data?.data?.testimonials ?? res.data?.testimonials ?? []) as Testimonial[];
};

export const fetchPublicCaseStudies = async () => {
  const res = await api.get("/public/case-studies");
  return (res.data?.data?.case_studies ?? res.data?.case_studies ?? []) as CaseStudy[];
};

export const fetchPublicFAQs = async () => {
  const res = await api.get("/public/faqs");
  return (res.data?.data?.faqs ?? res.data?.faqs ?? []) as FAQItem[];
};

export const fetchPublicConfig = async () => {
  const res = await api.get("/public/config");
  return (res.data?.data ?? res.data) as PublicConfig;
};

export const fetchSampleLedger = async () => {
  const res = await api.get("/public/sample-ledger");
  return (res.data?.data?.rows ?? res.data?.rows ?? []) as LedgerRow[];
};

export const submitLead = async (payload: LeadPayload) => {
  const res = await api.post<ApiEnvelope<{ lead_id: number; status: string }>>("/public/leads", payload);
  return res.data;
};

export const submitPublicContact = async (payload: ContactPayload) => {
  const res = await api.post<ApiEnvelope<{ message_id: number }>>("/public/contact", payload);
  return res.data;
};

export const subscribeNewsletter = async (payload: NewsletterPayload) => {
  const res = await api.post<ApiEnvelope<{ subscriber_id: number; status: string }>>(
    "/public/newsletter/subscribe",
    payload
  );
  return res.data;
};

export default api;

export const fetchAdminTrainingModules = async (params?: {
  audience?: string;
  published?: boolean;
  q?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<TrainingModuleListResponse>("/admin/training/modules", { params });
  return res.data;
};

export const fetchAdminTrainingModule = async (id: number) => {
  const res = await api.get<TrainingModuleAdmin>(`/admin/training/modules/${id}`);
  return res.data;
};

export const createAdminTrainingModule = async (payload: TrainingModulePayload) => {
  const res = await api.post<TrainingModuleAdmin>("/admin/training/modules", payload);
  return res.data;
};

export const updateAdminTrainingModule = async (id: number, payload: Partial<TrainingModulePayload>) => {
  const res = await api.patch<TrainingModuleAdmin>(`/admin/training/modules/${id}`, payload);
  return res.data;
};

export const deleteAdminTrainingModule = async (id: number) => {
  await api.delete(`/admin/training/modules/${id}`);
};

export const createTrainingLesson = async (
  moduleId: number,
  payload: { lesson_type: TrainingLessonType; title: string; content: string; order_index?: number }
) => {
  const res = await api.post<TrainingLesson>(`/admin/training/modules/${moduleId}/lessons`, payload);
  return res.data;
};

export const updateTrainingLesson = async (
  lessonId: number,
  payload: Partial<{ lesson_type: TrainingLessonType; title: string; content: string; order_index: number }>
) => {
  const res = await api.patch<TrainingLesson>(`/admin/training/lessons/${lessonId}`, payload);
  return res.data;
};

export const deleteTrainingLesson = async (lessonId: number) => {
  await api.delete(`/admin/training/lessons/${lessonId}`);
};

export const reorderTrainingLessons = async (moduleId: number, lessonIds: number[]) => {
  const res = await api.post<TrainingLesson[]>(`/admin/training/modules/${moduleId}/reorder-lessons`, {
    lesson_ids: lessonIds,
  });
  return res.data;
};

export const fetchAdminDemoRequests = async (params?: {
  q?: string;
  status?: string;
  org_type?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<DemoRequestListResponse>("/admin/demo-requests/", { params });
  return res.data;
};

export const fetchAdminDemoRequest = async (id: number) => {
  const res = await api.get<DemoRequest>(`/admin/demo-requests/${id}`);
  return res.data;
};

export const updateAdminDemoRequest = async (
  id: number,
  payload: { status?: DemoRequestStatus; admin_notes?: string }
) => {
  const res = await api.patch<DemoRequest>(`/admin/demo-requests/${id}`, payload);
  return res.data;
};

export const fetchAdminContactMessages = async (params?: {
  q?: string;
  status?: ContactMessageStatus;
  unread_only?: boolean;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<AdminContactMessageListResponse>("/admin/contact-messages/", { params });
  return res.data;
};

export const fetchAdminContactMessage = async (id: number) => {
  const res = await api.get<AdminContactMessage>(`/admin/contact-messages/${id}`);
  return res.data;
};

export const updateAdminContactMessage = async (
  id: number,
  payload: { status?: ContactMessageStatus; is_read?: boolean; admin_notes?: string | null }
) => {
  const res = await api.patch<AdminContactMessage>(`/admin/contact-messages/${id}`, payload);
  return res.data;
};

export const convertAdminContactMessageToDemo = async (
  id: number,
  payload?: { organization?: string; org_type?: "city" | "campus" | "society" | "corporate"; phone?: string }
) => {
  const res = await api.post<{ demo_request_id: number; contact_message: AdminContactMessage }>(
    `/admin/contact-messages/${id}/convert-to-demo`,
    payload || {}
  );
  return res.data;
};

export const fetchAdminAnalyticsSummary = async () => {
  const res = await api.get<AdminAnalyticsSummary>("/admin/analytics/summary");
  return res.data;
};

export const fetchAdminApprovals = async () => {
  const res = await api.get<{ items: AdminApproval[] }>("/admin/approvals");
  return res.data.items || [];
};

export const actAdminApproval = async (id: number, decision: "approve" | "reject") => {
  const res = await api.post<{ ok: boolean }>(`/admin/approvals/${id}`, { decision });
  return res.data;
};

export const fetchAdminZones = async (params?: { active?: boolean }) => {
  const res = await api.get<AdminZone[]>("/admin/zones", { params });
  return res.data;
};

export const createAdminZone = async (payload: { name: string; type: string; city: string; active: boolean }) => {
  const res = await api.post<AdminZone>("/admin/zones", payload);
  return res.data;
};

export const updateAdminZone = async (
  zoneId: number,
  payload: Partial<{ name: string; type: string; city: string; active: boolean }>
) => {
  const res = await api.patch<AdminZone>(`/admin/zones/${zoneId}`, payload);
  return res.data;
};

export const deleteAdminZone = async (zoneId: number) => {
  await api.delete(`/admin/zones/${zoneId}`);
};

export const fetchAdminWorkforce = async (params?: { q?: string }) => {
  const res = await api.get<AdminWorkforceUser[]>("/admin/workforce", { params });
  return res.data;
};

export const createAdminWorkforce = async (payload: {
  name: string;
  email: string;
  password: string;
  zone_id?: number | null;
}) => {
  const res = await api.post<AdminWorkforceUser>("/admin/workforce", payload);
  return res.data;
};

export const updateAdminWorkforce = async (
  userId: number,
  payload: Partial<{ full_name: string; is_active: boolean }>
) => {
  const res = await api.patch<AdminWorkforceUser>(`/admin/workforce/${userId}`, payload);
  return res.data;
};

export const assignAdminWorkforceZone = async (userId: number, zone_id?: number | null) => {
  const res = await api.post<AdminWorkforceUser>(`/admin/workforce/${userId}/assign-zone`, { zone_id: zone_id ?? null });
  return res.data;
};

export const fetchAdminPccSummary = async () => {
  const res = await api.get<AdminPccSummary>("/admin/pcc/summary");
  return res.data;
};

export const fetchAdminPccTransactions = async (params?: {
  date_from?: string;
  date_to?: string;
  user_id?: number;
  type?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<AdminPccTransactionsResponse>("/admin/pcc/transactions", { params });
  return res.data;
};

export const exportAdminPccTransactionsCsv = async (params?: {
  date_from?: string;
  date_to?: string;
  user_id?: number;
  type?: string;
}) => {
  const res = await api.get<string>("/admin/pcc/transactions/export.csv", {
    params,
    responseType: "text" as const,
  });
  return res.data;
};

export const fetchAdminPccSettings = async () => {
  const res = await api.get<PccSettings>("/admin/pcc/settings");
  return res.data;
};

export const fetchAdminPccEmissionFactors = async () => {
  const res = await api.get<EmissionFactorItem[]>("/admin/pcc/emission-factors");
  return res.data;
};

export const awardAdminPcc = async (payload: { reference_type: PccReferenceType; reference_id: number }) => {
  const res = await api.post<any>("/admin/pcc/award", payload);
  const raw = res.data || {};
  return {
    reference_type: (raw.reference_type || payload.reference_type) as PccReferenceType,
    reference_id: Number(raw.reference_id ?? payload.reference_id),
    transaction_id: Number(raw.transaction_id ?? 0),
    amount: Number(raw.amount ?? raw.awarded_pcc ?? raw.awarded ?? 0),
    pcc_status: String(raw.pcc_status ?? "awarded"),
  } as PccActionResponse;
};

export const bulkAwardAdminPcc = async (items: Array<{ reference_type: PccReferenceType; reference_id: number }>) => {
  const res = await api.post<PccBulkAwardResponse>("/admin/pcc/award/bulk", { items });
  return res.data;
};

export const revokeAdminPcc = async (payload: { reference_type: PccReferenceType; reference_id: number; reason?: string }) => {
  const res = await api.post<any>("/admin/pcc/revoke", payload);
  const raw = res.data || {};
  return {
    reference_type: (raw.reference_type || payload.reference_type) as PccReferenceType,
    reference_id: Number(raw.reference_id ?? payload.reference_id),
    transaction_id: Number(raw.transaction_id ?? 0),
    amount: Number(raw.amount ?? 0),
    pcc_status: String(raw.pcc_status ?? "revoked"),
  } as PccActionResponse;
};

export const fetchAdminCitizenSegregationLogs = async (params?: {
  q?: string;
  pcc_status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<CitizenSegregationLogListResponse>("/admin/logs/citizen-segregation", { params });
  return res.data;
};

export const fetchAdminBulkGeneratorLogs = async (params?: {
  q?: string;
  verification_status?: string;
  pcc_status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<BulkGeneratorLogListResponse>("/admin/logs/bulk-generator", { params });
  return res.data;
};

export const fetchAdminAuditLogs = async (params?: {
  actor?: string;
  action?: string;
  entity?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}) => {
  const res = await api.get<{ items: AdminAuditLog[]; total: number }>("/admin/audit-logs", { params });
  return res.data;
};

export const fetchPlatformSettings = async () => {
  const res = await api.get<PlatformSettings>("/admin/settings");
  return res.data;
};

export const updatePlatformSettings = async (payload: Partial<PlatformSettings>) => {
  const res = await api.put<PlatformSettings>("/admin/settings", payload);
  return res.data;
};

const CONTENT_KEY_MAP: Record<ContentTabType, string> = {
  partners: "partners",
  testimonials: "testimonials",
  "case-studies": "case_studies",
  faqs: "faqs",
};

export const fetchAdminContentItems = async (type: ContentTabType) => {
  const res = await api.get(`/admin/content/${type}`);
  const key = CONTENT_KEY_MAP[type];
  return (res.data?.data?.[key] || res.data?.data?.[type] || []) as Array<Partner | Testimonial | CaseStudy | FAQItem>;
};

export const createAdminContentItem = async (
  type: ContentTabType,
  payload: PartnerPayload | TestimonialPayload | CaseStudyPayload | FAQPayload
) => {
  const res = await api.post(`/admin/content/${type}`, payload);
  return res.data;
};

export const updateAdminContentItem = async (
  type: ContentTabType,
  id: number,
  payload: Partial<PartnerPayload | TestimonialPayload | CaseStudyPayload | FAQPayload>
) => {
  try {
    const res = await api.patch(`/admin/content/${type}/${id}`, payload);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status !== 405) throw err;
    const res = await api.put(`/admin/content/${type}/${id}`, payload);
    return res.data;
  }
};

export const deleteAdminContentItem = async (type: ContentTabType, id: number) => {
  await api.delete(`/admin/content/${type}/${id}`);
};

export const fetchAdminContentConfig = async () => {
  try {
    const res = await api.get("/admin/content/config");
    return res.data?.data?.config?.value_json ?? {};
  } catch {
    return {};
  }
};

export const upsertAdminContentConfig = async (key: string, value_json: Record<string, unknown>) => {
  const res = await api.put("/admin/content/config", { key, value_json });
  return res.data;
};
