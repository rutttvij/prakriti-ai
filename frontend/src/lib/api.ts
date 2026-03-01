import axios from "axios";

import type {
  ApiEnvelope,
  CaseStudy,
  ContactPayload,
  DemoRequest,
  DemoRequestListResponse,
  DemoRequestStatus,
  FAQItem,
  LeadPayload,
  LedgerRow,
  NewsletterPayload,
  Partner,
  PublicConfig,
  PublicStats,
  Testimonial,
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
