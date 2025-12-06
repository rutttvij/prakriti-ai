// src/lib/user.ts
import api from "./api";

export type UserProfileUpdatePayload = {
  full_name?: string;
  pincode?: string;
  phone?: string;
  city?: string;
  address?: string;
  ward?: string;
};

export async function updateMyProfile(data: UserProfileUpdatePayload) {
  // Avoid sending empty string for pincode – let backend keep old value
  const payload: UserProfileUpdatePayload = { ...data };

  if (payload.pincode !== undefined && payload.pincode.trim() === "") {
    delete payload.pincode;
  }

  const res = await api.put("/auth/me", payload); // 👈 important: NO /api/v1 here
  return res.data;
}
