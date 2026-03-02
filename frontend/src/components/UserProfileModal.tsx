import { useEffect, useMemo, useState } from "react";
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
  government_id?: string | null;
  role?: string | null;

  phone?: string | null;
  address?: string | null;
  city?: string | null;
  ward?: string | null;

  contact_mobile?: string | null;
  organization_name?: string | null;
  industry_type?: string | null;
  registration_or_license_no?: string | null;
  estimated_daily_waste_kg?: string | null;
  waste_categories?: string[];
  bulk_address?: string | null;
  bulk_ward?: string | null;
  bulk_pincode?: string | null;
  bulk_status?: string | null;
};

const BULK_INDUSTRY_OPTIONS = [
  "Apartment Society",
  "Hotel",
  "Hospital",
  "Office",
  "Institution",
  "Mall",
  "Factory",
] as const;

const BULK_CATEGORIES = ["PLASTIC", "PAPER", "GLASS", "METAL", "WET", "E_WASTE", "HAZARDOUS", "TEXTILE", "MIXED"] as const;

const BULK_ROLES = new Set(["BULK_GENERATOR", "BULK_MANAGER", "BULK_STAFF"]);

export const UserProfileModal: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();

  const [form, setForm] = useState<UserProfile>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isBulk = useMemo(() => BULK_ROLES.has(form.role || user?.role || ""), [form.role, user?.role]);

  useEffect(() => {
    if (!open) return;

    const fetchProfile = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const meRes = await api.get("/auth/me");
        const data = meRes.data;
        const meta = data.meta || {};

        const base: UserProfile = {
          id: data.id,
          full_name: data.full_name ?? "",
          email: data.email ?? "",
          pincode: data.pincode ?? "",
          government_id: data.government_id ?? "",
          phone: meta.phone ?? "",
          address: meta.address ?? "",
          city: meta.city ?? "",
          ward: meta.ward ?? "",
          role: data.role ?? user?.role ?? "",
        };

        if (BULK_ROLES.has(base.role || "")) {
          try {
            const bulkRes = await api.get("/bulk/me");
            const org = bulkRes.data?.data?.organization ?? {};
            const summary = bulkRes.data?.data?.summary ?? {};
            const contactMobile = meta.contact_mobile ?? "";

            setForm({
              ...base,
              contact_mobile: contactMobile,
              organization_name: org.organization_name ?? "",
              industry_type: org.industry_type ?? BULK_INDUSTRY_OPTIONS[0],
              registration_or_license_no: org.registration_or_license_no ?? "",
              estimated_daily_waste_kg: org.estimated_daily_waste_kg != null ? String(org.estimated_daily_waste_kg) : "",
              waste_categories: Array.isArray(org.waste_categories) ? org.waste_categories : [],
              bulk_address: org.address ?? "",
              bulk_ward: org.ward ?? "",
              bulk_pincode: org.pincode ?? base.pincode ?? "",
              bulk_status: org.status ?? summary.status ?? "",
            });
          } catch {
            setForm(base);
          }
        } else {
          setForm(base);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [open, user?.role]);

  const handleChange = (field: keyof UserProfile, value: string | null | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const toggleBulkCategory = (category: string) => {
    setForm((prev) => {
      const list = prev.waste_categories || [];
      const next = list.includes(category) ? list.filter((c) => c !== category) : [...list, category];
      return { ...prev, waste_categories: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isBulk) {
        const payload = {
          full_name: form.full_name ?? "",
          contact_mobile: form.contact_mobile ?? "",
          pincode: form.bulk_pincode ?? form.pincode ?? "",
          organization_name: form.organization_name ?? "",
          industry_type: form.industry_type ?? BULK_INDUSTRY_OPTIONS[0],
          registration_or_license_no: form.registration_or_license_no || null,
          estimated_daily_waste_kg: form.estimated_daily_waste_kg ? Number(form.estimated_daily_waste_kg) : undefined,
          waste_categories: form.waste_categories ?? [],
          address: form.bulk_address ?? "",
          ward: form.bulk_ward ?? "",
        };
        await api.put("/bulk/me", payload);
      } else {
        const payload: any = {
          full_name: form.full_name,
          phone: form.phone,
          ward: form.ward,
          address: form.address,
        };
        if (form.pincode && form.pincode.trim() !== "") {
          payload.pincode = form.pincode;
        }
        await api.put("/auth/me", payload);
      }

      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not save changes. Please check your input and try again.");
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
      : form.role === "BULK_MANAGER"
      ? "Bulk Manager"
      : form.role === "BULK_STAFF"
      ? "Bulk Staff"
      : form.role === "BULK_GENERATOR"
      ? "Bulk Generator"
      : "Citizen";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm" onClick={onClose}>
      <div className="surface-card-strong max-h-[90vh] w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-emerald-50/80 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Your profile</h2>
            <p className="text-[0.7rem] text-slate-500">Review your registered details and update your information.</p>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 py-1 text-xs">Close</button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto space-y-4 px-6 py-4">
          {loading ? (
            <p className="text-xs text-slate-500">Loading profile…</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-50/80 bg-gradient-to-r from-emerald-50/80 via-white/80 to-emerald-50/70 px-4 py-3 backdrop-blur-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{form.full_name || "Unnamed user"}</p>
                  <p className="text-xs text-slate-600">{form.email}</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[0.7rem] font-medium text-emerald-800">{roleLabel}</span>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Full Name</label>
                  <input type="text" value={form.full_name ?? ""} onChange={(e) => handleChange("full_name", e.target.value)} className="ui-input" />
                </div>

                {isBulk ? (
                  <>
                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Contact Mobile</label>
                      <input type="text" value={form.contact_mobile ?? ""} onChange={(e) => handleChange("contact_mobile", e.target.value)} className="ui-input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Organization Name</label>
                      <input type="text" value={form.organization_name ?? ""} onChange={(e) => handleChange("organization_name", e.target.value)} className="ui-input" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Industry Type</label>
                        <select className="ui-input" value={form.industry_type ?? BULK_INDUSTRY_OPTIONS[0]} onChange={(e) => handleChange("industry_type", e.target.value)}>
                          {BULK_INDUSTRY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Registration / License No</label>
                        <input type="text" value={form.registration_or_license_no ?? ""} onChange={(e) => handleChange("registration_or_license_no", e.target.value)} className="ui-input" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Estimated Daily Waste (kg)</label>
                      <input type="number" min="0" step="0.1" value={form.estimated_daily_waste_kg ?? ""} onChange={(e) => handleChange("estimated_daily_waste_kg", e.target.value)} className="ui-input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Waste Categories</label>
                      <div className="flex flex-wrap gap-2">
                        {BULK_CATEGORIES.map((cat) => {
                          const active = (form.waste_categories || []).includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleBulkCategory(cat)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-slate-900 bg-slate-900 text-white" : "border-emerald-200 bg-white text-emerald-800"}`}
                            >
                              {cat.replaceAll("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Address</label>
                      <textarea rows={2} value={form.bulk_address ?? ""} onChange={(e) => handleChange("bulk_address", e.target.value)} className="ui-input min-h-[84px]" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Ward</label>
                        <input type="text" value={form.bulk_ward ?? ""} onChange={(e) => handleChange("bulk_ward", e.target.value)} className="ui-input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Pincode (6-digit)</label>
                        <input type="text" value={form.bulk_pincode ?? ""} onChange={(e) => handleChange("bulk_pincode", e.target.value)} className="ui-input" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Mobile Number</label>
                      <input type="text" value={form.phone ?? ""} onChange={(e) => handleChange("phone", e.target.value)} className="ui-input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Pincode (6-digit)</label>
                      <input type="text" value={form.pincode ?? ""} onChange={(e) => handleChange("pincode", e.target.value)} className="ui-input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Ward / Area (optional)</label>
                      <input type="text" value={form.ward ?? ""} onChange={(e) => handleChange("ward", e.target.value)} className="ui-input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Address / Landmark (optional)</label>
                      <textarea rows={2} value={form.address ?? ""} onChange={(e) => handleChange("address", e.target.value)} className="ui-input min-h-[84px]" />
                    </div>
                  </>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Email (login)</label>
                    <input value={form.email ?? ""} readOnly className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Role</label>
                    <input value={roleLabel} readOnly className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Government ID</label>
                    <input value={form.government_id ?? ""} readOnly className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                  </div>
                  {isBulk && (
                    <div>
                      <label className="mb-1 block text-[0.7rem] font-medium text-slate-600">Org Status</label>
                      <input value={form.bulk_status ?? ""} readOnly className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
              {successMsg && <p className="text-xs text-emerald-700">{successMsg}</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-emerald-50/80 bg-white/70 px-6 py-3 backdrop-blur-md">
          <button onClick={onClose} className="btn-secondary px-4 py-1.5 text-xs font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary px-5 py-1.5 text-xs disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
