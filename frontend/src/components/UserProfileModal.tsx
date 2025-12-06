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
  phone?: string | null;
  pincode?: string | null;
  address?: string | null;
  city?: string | null;
  role?: string | null;
  ward?: string | null;
};

export const UserProfileModal: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth() as { user?: { role?: string | null } };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch profile when modal opens
  useEffect(() => {
    if (!open) return;
    const fetchProfile = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        // Adjust endpoint if your backend uses a different one
        const res = await api.get("/auth/me");
        const data = res.data as UserProfile;
        setProfile(data);
        setForm({
          full_name: data.full_name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          pincode: data.pincode ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          ward: data.ward ?? "",
          role: data.role ?? user?.role ?? "",
        });
      } catch (err) {
        setErrorMsg("Could not load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [open, user?.role]);

  const handleChange = (
    field: keyof UserProfile,
    value: string | null | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Only send fields that are user-editable
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        pincode: form.pincode,
        address: form.address,
        city: form.city,
        ward: form.ward,
      };

      // Adjust endpoint/method to your backend contract if needed
      await api.patch("/auth/me", payload);

      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
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
      : form.role
      ? "Citizen"
      : "User";

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-slate-900/30 backdrop-blur-sm
      "
      onClick={onClose}
    >
      <div
        className="
          max-h-[90vh] w-full max-w-lg overflow-hidden
          rounded-[1.75rem]
          border border-emerald-100/80
          bg-white/85
          shadow-2xl shadow-emerald-200/80
          backdrop-blur-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-emerald-50/80 px-6 py-4 flex items-center justify-between">
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

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <p className="text-xs text-slate-500">Loading profile…</p>
          ) : (
            <>
              {/* Top summary row */}
              <div
                className="
                  rounded-2xl border border-emerald-50/80
                  bg-gradient-to-r from-emerald-50/80 via-white/80 to-emerald-50/70
                  px-4 py-3 flex items-center justify-between gap-3
                  backdrop-blur-sm
                "
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {form.full_name || "Unnamed user"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {form.email || "No email on record"}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[0.7rem] font-medium text-emerald-800">
                  {roleLabel}
                </span>
              </div>

              {/* Editable fields */}
              <div className="grid gap-4">
                <div>
                  <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.full_name ?? ""}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="
                      w-full rounded-xl border border-emerald-100/80
                      bg-white/80 px-3 py-2 text-sm
                      shadow-sm shadow-emerald-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                    "
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone ?? ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="
                      w-full rounded-xl border border-emerald-100/80
                      bg-white/80 px-3 py-2 text-sm
                      shadow-sm shadow-emerald-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                    "
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={form.pincode ?? ""}
                      onChange={(e) =>
                        handleChange("pincode", e.target.value)
                      }
                      className="
                        w-full rounded-xl border border-emerald-100/80
                        bg-white/80 px-3 py-2 text-sm
                        shadow-sm shadow-emerald-50
                        focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                      "
                    />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city ?? ""}
                      onChange={(e) => handleChange("city", e.target.value)}
                      className="
                        w-full rounded-xl border border-emerald-100/80
                        bg-white/80 px-3 py-2 text-sm
                        shadow-sm shadow-emerald-50
                        focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                      "
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={form.address ?? ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="
                      w-full rounded-2xl border border-emerald-100/80
                      bg-white/80 px-3 py-2 text-sm
                      shadow-sm shadow-emerald-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                    "
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                    Ward / Area (optional)
                  </label>
                  <input
                    type="text"
                    value={form.ward ?? ""}
                    onChange={(e) => handleChange("ward", e.target.value)}
                    className="
                      w-full rounded-xl border border-emerald-100/80
                      bg-white/80 px-3 py-2 text-sm
                      shadow-sm shadow-emerald-50
                      focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                    "
                  />
                </div>

                {/* Read-only email + role */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                      Email (login)
                    </label>
                    <input
                      value={form.email ?? ""}
                      readOnly
                      className="
                        w-full rounded-xl border border-slate-100
                        bg-slate-50 px-3 py-2 text-sm text-slate-500
                      "
                    />
                  </div>
                  <div>
                    <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
                      Role
                    </label>
                    <input
                      value={roleLabel}
                      readOnly
                      className="
                        w-full rounded-xl border border-slate-100
                        bg-slate-50 px-3 py-2 text-sm text-slate-500
                      "
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-700 mt-1">{successMsg}</p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-emerald-50/80 px-6 py-3 flex justify-end gap-3 bg-white/70 backdrop-blur-md">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="
              rounded-full bg-emerald-700 px-5 py-1.5 text-xs font-semibold text-white
              shadow-sm shadow-emerald-400/60
              hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
