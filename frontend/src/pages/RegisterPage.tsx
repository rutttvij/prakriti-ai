import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

type Role = "CITIZEN" | "WASTE_WORKER" | "BULK_GENERATOR";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

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

  const [bulkOrgName, setBulkOrgName] = useState("");
  const [bulkType, setBulkType] = useState("");
  const [bulkContactMobile, setBulkContactMobile] = useState("");
  const [bulkAddressWard, setBulkAddressWard] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = (): boolean => {
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!governmentId.trim()) {
      setError("Government ID is required.");
      return false;
    }
    if (!/^\d{12}$/.test(governmentId.trim())) {
      setError("Government ID must be exactly 12 digits.");
      return false;
    }
    if (!pincode.trim()) {
      setError("Pincode is required.");
      return false;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError("Pincode must be exactly 6 digits.");
      return false;
    }
    if (!password) {
      setError("Password is required.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

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

    if (role === "BULK_GENERATOR") {
      if (bulkOrgName) meta.organization = bulkOrgName;
      if (bulkType) meta.type = bulkType;
      if (bulkContactMobile) meta.contact_mobile = bulkContactMobile;
      if (bulkAddressWard) meta.address_ward = bulkAddressWard;
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

    try {
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
          // keep default message
        }
        setError(message);
      } else {
        setSuccess(
          "Registration successful! Your account is pending approval by the admin."
        );
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRoleSpecificFields = () => {
    if (role === "CITIZEN") {
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              className="ui-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Ward / Area
            </label>
            <input
              type="text"
              className="ui-input"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Address / Landmark (optional)
            </label>
            <textarea
              className="ui-input min-h-[84px]"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </>
      );
    }

    if (role === "WASTE_WORKER") {
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              className="ui-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Worker / Employee ID
            </label>
            <input
              type="text"
              className="ui-input"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Ward / Zone Assigned
            </label>
            <input
              type="text"
              className="ui-input"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Organization (e.g. Municipal Corporation)
            </label>
            <input
              type="text"
              className="ui-input"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </>
      );
    }

    if (role === "BULK_GENERATOR") {
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Organization / Building Name
            </label>
            <input
              type="text"
              className="ui-input"
              value={bulkOrgName}
              onChange={(e) => setBulkOrgName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Type (Apartment / Hotel / Office / Institution)
            </label>
            <input
              type="text"
              className="ui-input"
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Contact Mobile
            </label>
            <input
              type="tel"
              className="ui-input"
              value={bulkContactMobile}
              onChange={(e) => setBulkContactMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Address / Ward
            </label>
            <textarea
              className="ui-input min-h-[84px]"
              rows={2}
              value={bulkAddressWard}
              onChange={(e) => setBulkAddressWard(e.target.value)}
            />
          </div>
        </>
      );
    }

    return null;
  };

  const roleLabel = (r: Role) =>
    r === "CITIZEN"
      ? "Citizen"
      : r === "WASTE_WORKER"
      ? "Waste Worker"
      : "Bulk Generator";

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
              Register as a Citizen, Waste Worker, or Bulk Generator. Your account
              is activated after city-admin verification for accountable civic operations.
            </p>

            <div className="mt-6 grid gap-3 text-xs text-emerald-50/92">
              <div className="rounded-2xl border border-white/28 bg-white/12 p-3">
                <p className="font-semibold text-emerald-100">Citizens</p>
                <p className="mt-1 text-[0.75rem] text-[#dffaf0]">
                  Report local waste issues, track resolution, and earn climate-linked rewards.
                </p>
              </div>
              <div className="rounded-2xl border border-white/28 bg-white/12 p-3">
                <p className="font-semibold text-emerald-100">Waste Workers</p>
                <p className="mt-1 text-[0.75rem] text-[#dffaf0]">
                  Claim jobs, update field status, and close reports with proof-backed workflow.
                </p>
              </div>
              <div className="rounded-2xl border border-white/28 bg-white/12 p-3">
                <p className="font-semibold text-emerald-100">Bulk Generators</p>
                <p className="mt-1 text-[0.75rem] text-[#dffaf0]">
                  Log segregation from campuses, societies, and enterprises with audit-ready insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: glassy registration form */}
        <section
          className="
            surface-card-strong mx-auto w-full max-w-2xl p-3 sm:p-4
            max-h-[88vh] overflow-hidden
          "
        >
          <div className="admin-scrollbar admin-scrollbar-inset max-h-[calc(88vh-2rem)] overflow-y-auto overflow-x-hidden px-2 pb-2 sm:px-3">
            <p className="mb-3 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-700 lg:hidden">
              Civic Intelligence Platform
            </p>
            <div className="mb-4 flex items-center justify-center">
              <div className="h-12 w-12 overflow-hidden rounded-2xl shadow-md shadow-emerald-300/60">
                <img
                  src={logo}
                  alt="Prakriti.AI logo"
                  className="h-full w-full scale-[1.28] object-cover object-center"
                />
              </div>
            </div>
            {/* Role pills */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(["CITIZEN", "WASTE_WORKER", "BULK_GENERATOR"] as Role[]).map(
                (r) => {
                  const active = r === role;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.28)]"
                          : "border-emerald-100 bg-white/80 text-emerald-800 hover:bg-white"
                      }`}
                    >
                      {roleLabel(r)}
                    </button>
                  );
                }
              )}
            </div>

          <p className="text-[0.7rem] text-slate-500 mb-3">
            You’re registering as{" "}
            <span className="font-semibold text-emerald-800">
              {roleLabel(role)}
            </span>
            . You can request a role change later via the city admin.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common fields */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                className="ui-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="ui-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Government ID (12-digit)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  className="ui-input"
                  value={governmentId}
                  onChange={(e) => setGovernmentId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Pincode (6-digit)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="ui-input"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  className="ui-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  className="ui-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Role-specific */}
            <div className="pt-3 border-t border-emerald-50">
              <p className="mb-2 text-[0.7rem] font-semibold text-slate-500">
                Additional details ({roleLabel(role)})
              </p>
              <div className="space-y-3">{renderRoleSpecificFields()}</div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Register with Prakriti.AI"}
            </button>
          </form>

            <p className="mt-3 text-center text-xs text-slate-600">
              Already registered?{" "}
              <Link to="/auth/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
