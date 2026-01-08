// src/components/UserProfileModal.tsx

import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

type UserProfile = {
  id?: number;
  full_name?: string | null;
  email?: string | null;
  pincode?: string | null;
  role?: string | null;

  // meta fields
  phone?: string | null; // Mobile Number
  address?: string | null; // Address / Landmark (optional)
  city?: string | null; // kept in state but not shown in UI now
  ward?: string | null; // Ward / Area
};

export const UserProfileModal: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [form, setForm] = useState<UserProfile>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Load profile when modal opens
  // ---------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const fetchProfile = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const res = await api.get("/auth/me");
        const data = res.data;

        setProfile(data);

        const meta = data.meta || {};

        setForm({
          full_name: data.full_name ?? "",
          email: data.email ?? "",
          pincode: data.pincode ?? "",

          // meta fields
          phone: meta.phone ?? "",
          address: meta.address ?? "",
          city: meta.city ?? "",
          ward: meta.ward ?? "",

          role: data.role ?? user?.role ?? "",
        });
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [open, user?.role]);

  // ---------------------------------------------------------
  // Handle input changes
  // ---------------------------------------------------------
  const handleChange = (
    field: keyof UserProfile,
    value: string | null | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  // ---------------------------------------------------------
  // Save profile → PUT /auth/me
  // ---------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        full_name: form.full_name,
        phone: form.phone,
        ward: form.ward,
        address: form.address,
      };

      // only send pincode if non-empty
      if (form.pincode && form.pincode.trim() !== "") {
        payload.pincode = form.pincode;
      }

      await api.put("/auth/me", payload);

      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const roleLabel =
    form.role === "SUPER_ADMIN"
      ? "Super Admin"
      : form.role === "WASTE_WORKER"
      ? "Waste Worker"
      : form.role === "BULK_GENERATOR"
      ? "Bulk Generator"
      : "Citizen";

  // ---------------------------------------------------------
  // UI Rendering
  // ---------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="
          max-h-[90vh] w-full max-w-lg overflow-hidden
          rounded-[1.75rem] border border-emerald-100/80
          bg-white/85 shadow-2xl shadow-emerald-200/80 backdrop-blur-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-50/80 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Your profile
            </h2>
            <p className="text-[0.7rem] text-slate-500">
              Review your registered details and update personal information.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto space-y-4 px-6 py-4">
          {loading ? (
            <p className="text-xs text-slate-500">Loading profile…</p>
          ) : (
            <>
              {/* User summary */}
              <div
                className="
                  flex items-center justify-between gap-3
                  rounded-2xl border border-emerald-50/80
                  bg-gradient-to-r from-emerald-50/80 via-white/80 to-emerald-50/70
                  px-4 py-3 backdrop-blur-sm
                "
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {form.full_name || "Unnamed user"}
                  </p>
                  <p className="text-xs text-slate-600">{form.email}</p>
                </div>

                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[0.7rem] font-medium text-emerald-800">
                  {roleLabel}
                </span>
              </div>

              {/* Editable fields */}
              <div className="grid gap-4">
                {/* Full name */}
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.full_name ?? ""}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={form.phone ?? ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                    Pincode (6-digit)
                  </label>
                  <input
                    type="text"
                    value={form.pincode ?? ""}
                    onChange={(e) => handleChange("pincode", e.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                {/* Ward / Area */}
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                    Ward / Area (optional)
                  </label>
                  <input
                    type="text"
                    value={form.ward ?? ""}
                    onChange={(e) => handleChange("ward", e.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                {/* Address / Landmark */}
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                    Address / Landmark (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.address ?? ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                {/* Read-only email & role */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                      Email (login)
                    </label>
                    <input
                      value={form.email ?? ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">
                      Role
                    </label>
                    <input
                      value={roleLabel}
                      readOnly
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              {errorMsg && (
                <p className="text-xs text-red-600">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-700">{successMsg}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-emerald-50/80 bg-white/70 px-6 py-3 backdrop-blur-md">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-full bg-emerald-700 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
