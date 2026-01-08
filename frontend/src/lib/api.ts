// src/lib/api.ts:

import axios from "axios";

const API_ROOT = (import.meta.env.VITE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8000") as string;

const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token && token !== "undefined" && token !== "null") {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      // Optional: window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/* ---------------------------
   CONTACT API HELPERS
---------------------------- */

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

/**
 * Public endpoint – store a contact-us message.
 * Expects backend route: POST /api/v1/contact
 */
export const submitContactMessage = (payload: ContactPayload) =>
  api.post("/contact", payload);

/**
 * Super admin: list contact-us messages.
 * Expects backend route: GET /api/v1/contact/admin
 */
export const fetchContactMessagesAdmin = (params?: {
  skip?: number;
  limit?: number;
}) => api.get("/contact/admin", { params });

/* ---------------------------
   CITIZEN DASHBOARD HELPERS
---------------------------- */

export type CitizenSummary = {
  training: {
    completed_modules: number;
    total_modules: number;
    badges_earned: number;
    next_module_title?: string | null;
  };
  segregation: {
    today_status: "DONE" | "PENDING" | "MISSED" | "UNKNOWN";
    today_score: number | null; // 0-100
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

/**
 * Citizen dashboard summary
 * Expects backend route: GET /api/v1/citizen/summary
 */
export const fetchCitizenSummary = () =>
  api.get<CitizenSummary>("/citizen/summary");

export default api;
