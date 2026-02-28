import axios from "axios";

import type {
  ApiEnvelope,
  CaseStudy,
  ContactPayload,
  FAQItem,
  LeadPayload,
  LedgerRow,
  NewsletterPayload,
  Partner,
  PublicConfig,
  PublicStats,
  Testimonial,
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
  const res = await api.get<ApiEnvelope<{ stats: PublicStats }>>("/public/stats");
  return res.data.data.stats;
};

export const fetchPublicPartners = async () => {
  const res = await api.get<ApiEnvelope<{ partners: Partner[] }>>("/public/partners");
  return res.data.data.partners;
};

export const fetchPublicTestimonials = async () => {
  const res = await api.get<ApiEnvelope<{ testimonials: Testimonial[] }>>("/public/testimonials");
  return res.data.data.testimonials;
};

export const fetchPublicCaseStudies = async () => {
  const res = await api.get<ApiEnvelope<{ case_studies: CaseStudy[] }>>("/public/case-studies");
  return res.data.data.case_studies;
};

export const fetchPublicFAQs = async () => {
  const res = await api.get<ApiEnvelope<{ faqs: FAQItem[] }>>("/public/faqs");
  return res.data.data.faqs;
};

export const fetchPublicConfig = async () => {
  const res = await api.get<ApiEnvelope<PublicConfig>>("/public/config");
  return res.data.data;
};

export const fetchSampleLedger = async () => {
  const res = await api.get<ApiEnvelope<{ rows: LedgerRow[] }>>("/public/sample-ledger");
  return res.data.data.rows;
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
