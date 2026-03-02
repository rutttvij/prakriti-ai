import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

type Role = "CITIZEN" | "WASTE_WORKER" | "BULK_GENERATOR";
type BulkStep = 1 | 2;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

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

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("CITIZEN");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [governmentId, setGovernmentId] = useState("");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");

  const [workerId, setWorkerId] = useState("");
  const [organization, setOrganization] = useState("");

  const [bulkStep, setBulkStep] = useState<BulkStep>(1);
  const [bulkContactMobile, setBulkContactMobile] = useState("");
  const [bulkOrgName, setBulkOrgName] = useState("");
  const [bulkIndustryType, setBulkIndustryType] = useState<(typeof BULK_INDUSTRY_OPTIONS)[number]>("Apartment Society");
  const [bulkLicenseNo, setBulkLicenseNo] = useState("");
  const [bulkEstimatedWasteKg, setBulkEstimatedWasteKg] = useState("");
  const [bulkWasteCategories, setBulkWasteCategories] = useState<string[]>([]);
  const [bulkAddress, setBulkAddress] = useState("");
  const [bulkWard, setBulkWard] = useState("");
  const [bulkPincode, setBulkPincode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleLabel = (r: Role) =>
    r === "CITIZEN" ? "Citizen" : r === "WASTE_WORKER" ? "Waste Worker" : "Bulk Generator";

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const validateCommon = () => {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^\d{12}$/.test(governmentId.trim())) return "Government ID must be exactly 12 digits.";
    if (!password) return "Password is required.";
    if (password !== confirmPassword) return "Password and Confirm Password do not match.";
    return null;
  };

  const validateCitizenWorker = () => {
    if (!/^\d{6}$/.test(pincode.trim())) return "Pincode must be exactly 6 digits.";
    return null;
  };

  const validateBulkStep1 = () => {
    const commonError = validateCommon();
    if (commonError) return commonError;
    if (!/^\d{10,15}$/.test(bulkContactMobile.trim())) return "Contact mobile must be 10 to 15 digits.";
    return null;
  };

  const validateBulkStep2 = () => {
    if (!bulkOrgName.trim()) return "Organization name is required.";
    const estimated = Number(bulkEstimatedWasteKg);
    if (!Number.isFinite(estimated) || estimated <= 0) return "Estimated daily waste must be greater than 0.";
    if (bulkWasteCategories.length === 0) return "Select at least one waste category.";
    if (!bulkAddress.trim()) return "Address is required.";
    if (!bulkWard.trim()) return "Ward is required.";
    if (!/^\d{6}$/.test(bulkPincode.trim())) return "Pincode must be exactly 6 digits.";
    return null;
  };

  const toggleBulkCategory = (category: string) => {
    setBulkWasteCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const submitCitizenOrWorker = async () => {
    const roleError = validateCitizenWorker();
    if (roleError) {
      setError(roleError);
      return;
    }

    const meta: Record<string, string> = {};

    if (role === "CITIZEN") {
      if (mobile) meta.phone = mobile;
      if (ward) meta.ward = ward;
      if (address) meta.address = address;
    }

    if (role === "WASTE_WORKER") {
      if (mobile) meta.phone = mobile;
      if (workerId) meta.worker_id = workerId;
      if (ward) meta.ward_zone = ward;
      if (organization) meta.organization = organization;
    }

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      role,
      government_id: governmentId.trim(),
      pincode: pincode.trim(),
      meta,
    };

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "Registration failed.";
      try {
        const data = await res.json();
        if (data.detail) {
          message = Array.isArray(data.detail)
            ? data.detail.map((d: any) => d.msg ?? d).join(", ")
            : data.detail;
        }
      } catch {
        // ignore json parse issues
      }
      setError(message);
      return;
    }

    setSuccess("Registration successful! Your account is pending approval by the admin.");
    setTimeout(() => navigate("/login"), 1500);
  };

  const submitBulk = async () => {
    const step1Error = validateBulkStep1();
    if (step1Error) {
      setError(step1Error);
      return;
    }
    const step2Error = validateBulkStep2();
    if (step2Error) {
      setError(step2Error);
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      contact_mobile: bulkContactMobile.trim(),
      government_id: governmentId.trim(),
      password,
      confirm_password: confirmPassword,
      organization_name: bulkOrgName.trim(),
      industry_type: bulkIndustryType,
      registration_or_license_no: bulkLicenseNo.trim() || null,
      estimated_daily_waste_kg: Number(bulkEstimatedWasteKg),
      waste_categories: bulkWasteCategories,
      address: bulkAddress.trim(),
      ward: bulkWard.trim(),
      pincode: bulkPincode.trim(),
    };

    const res = await fetch(`${API_BASE_URL}/auth/register/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "Bulk application failed.";
      try {
        const data = await res.json();
        if (data.detail) {
          message = Array.isArray(data.detail)
            ? data.detail.map((d: any) => d.msg ?? d).join(", ")
            : data.detail;
        }
      } catch {
        // ignore
      }
      setError(message);
      return;
    }

    setSuccess("Application submitted. Your Bulk Generator account is pending admin approval.");
    setTimeout(() => navigate("/login"), 1800);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    const commonError = validateCommon();
    if (commonError) {
      setError(commonError);
      return;
    }

    setSubmitting(true);
    try {
      if (role === "BULK_GENERATOR") {
        await submitBulk();
      } else {
        await submitCitizenOrWorker();
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCitizenFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Mobile Number</label>
        <input type="tel" className="ui-input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Ward / Area</label>
        <input type="text" className="ui-input" value={ward} onChange={(e) => setWard(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Address / Landmark (optional)</label>
        <textarea className="ui-input min-h-[84px]" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
    </>
  );

  const renderWorkerFields = () => (
    <>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Mobile Number</label>
        <input type="tel" className="ui-input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Worker / Employee ID</label>
        <input type="text" className="ui-input" value={workerId} onChange={(e) => setWorkerId(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Ward / Zone Assigned</label>
        <input type="text" className="ui-input" value={ward} onChange={(e) => setWard(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Organization</label>
        <input type="text" className="ui-input" value={organization} onChange={(e) => setOrganization(e.target.value)} />
      </div>
    </>
  );

  const renderBulkFields = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-white/70 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${bulkStep === 1 ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"}`}>1</span>
          <span>Account Owner (Authorized Compliance Officer)</span>
        </div>
        {bulkStep === 1 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Contact Mobile</label>
              <input type="tel" className="ui-input" value={bulkContactMobile} onChange={(e) => setBulkContactMobile(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <p className="text-[11px] text-slate-500">
                Full Name, Email, Government ID, Password and Confirm Password are captured in the common section above.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white/70 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${bulkStep === 2 ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"}`}>2</span>
          <span>Organization Details</span>
        </div>
        {bulkStep === 2 && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Organization Name</label>
                <input type="text" className="ui-input" value={bulkOrgName} onChange={(e) => setBulkOrgName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Industry Type</label>
                <select className="ui-input" value={bulkIndustryType} onChange={(e) => setBulkIndustryType(e.target.value as (typeof BULK_INDUSTRY_OPTIONS)[number])}>
                  {BULK_INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Registration / License No (optional)</label>
                <input type="text" className="ui-input" value={bulkLicenseNo} onChange={(e) => setBulkLicenseNo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Estimated Daily Waste (kg)</label>
                <input type="number" min="0" step="0.1" className="ui-input" value={bulkEstimatedWasteKg} onChange={(e) => setBulkEstimatedWasteKg(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Waste Categories</label>
              <div className="flex flex-wrap gap-2">
                {BULK_CATEGORIES.map((cat) => {
                  const active = bulkWasteCategories.includes(cat);
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
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Address</label>
              <textarea className="ui-input min-h-[84px]" rows={2} value={bulkAddress} onChange={(e) => setBulkAddress(e.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Ward</label>
                <input type="text" className="ui-input" value={bulkWard} onChange={(e) => setBulkWard(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Pincode</label>
                <input type="text" maxLength={6} className="ui-input" value={bulkPincode} onChange={(e) => setBulkPincode(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => setBulkStep(1)} disabled={bulkStep === 1}>Section 1</button>
        <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => {
          const err = validateBulkStep1();
          if (err) setError(err);
          else {
            setError(null);
            setBulkStep(2);
          }
        }}>
          Section 2
        </button>
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen flex items-center landing-aurora overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute left-[12%] top-[8%] h-80 w-80 rounded-full bg-emerald-200/28 blur-[130px]" />
      <div className="pointer-events-none absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-cyan-200/22 blur-[125px]" />
      <div className="pointer-events-none absolute left-[28%] bottom-[8%] h-72 w-72 rounded-full bg-emerald-300/14 blur-[130px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="rounded-[2rem] border border-white/20 bg-slate-950/26 p-8 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
            <div className="inline-flex items-center rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.72rem] font-semibold text-emerald-100">
              Join Prakriti.AI
            </div>
            <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] text-white">
              Create your Prakriti.AI
              <br />
              account.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#dffaf0]">
              Register as a Citizen, Waste Worker, or Bulk Generator. Your account is activated after city-admin verification.
            </p>
          </div>
        </section>

        <section className="surface-card-strong mx-auto w-full max-w-2xl p-3 sm:p-4 max-h-[88vh] overflow-hidden">
          <div className="admin-scrollbar admin-scrollbar-inset max-h-[calc(88vh-2rem)] overflow-y-auto overflow-x-hidden px-2 pb-2 sm:px-3">
            <div className="mb-4 flex items-center justify-center">
              <div className="h-12 w-12 overflow-hidden rounded-2xl shadow-md shadow-emerald-300/60">
                <img src={logo} alt="Prakriti.AI logo" className="h-full w-full scale-[1.28] object-cover object-center" />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {(["CITIZEN", "WASTE_WORKER", "BULK_GENERATOR"] as Role[]).map((r) => {
                const active = r === role;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setBulkStep(1);
                      resetMessages();
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.28)]"
                        : "border-emerald-100 bg-white/80 text-emerald-800 hover:bg-white"
                    }`}
                  >
                    {roleLabel(r)}
                  </button>
                );
              })}
            </div>

            <p className="text-[0.7rem] text-slate-500 mb-3">
              You&apos;re registering as <span className="font-semibold text-emerald-800">{roleLabel(role)}</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                <input type="text" className="ui-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                <input type="email" className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Government ID (12-digit)</label>
                  <input type="text" maxLength={12} className="ui-input" value={governmentId} onChange={(e) => setGovernmentId(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Pincode (6-digit)</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="ui-input"
                    value={role === "BULK_GENERATOR" ? bulkPincode : pincode}
                    onChange={(e) => (role === "BULK_GENERATOR" ? setBulkPincode(e.target.value) : setPincode(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <input type="password" className="ui-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm Password</label>
                  <input type="password" className="ui-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-50">
                <p className="mb-2 text-[0.7rem] font-semibold text-slate-500">Additional details ({roleLabel(role)})</p>
                <div className="space-y-3">
                  {role === "CITIZEN" && renderCitizenFields()}
                  {role === "WASTE_WORKER" && renderWorkerFields()}
                  {role === "BULK_GENERATOR" && renderBulkFields()}
                </div>
              </div>

              {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              {success && <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}

              <button type="submit" disabled={submitting} className="btn-primary mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting..." : role === "BULK_GENERATOR" ? "Submit Bulk Application" : "Register with Prakriti.AI"}
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-slate-600">
              Already registered? <Link to="/auth/login" className="font-semibold text-emerald-700 hover:text-emerald-800">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
