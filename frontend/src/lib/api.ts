// src/lib/api.ts
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

export default api;
