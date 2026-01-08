import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Address / Landmark (optional)
            </label>
            <textarea
              className="w-full rounded-2xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={bulkContactMobile}
              onChange={(e) => setBulkContactMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Address / Ward
            </label>
            <textarea
              className="w-full rounded-2xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
    <main
      className="
       relative flex-1 flex items-center
       bg-gradient-to-b from-emerald-50 via-emerald-50 to-slate-50
       overflow-hidden
      "
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-80" />
      <div className="pointer-events-none absolute -right-40 top-40 h-64 w-64 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:items-stretch">
        {/* Left: pitch + role explainer */}
        <section className="md:w-1/2 space-y-5">
          <div className="inline-flex items-center rounded-full bg-emerald-50/80 px-3 py-1 text-[0.7rem] font-semibold text-emerald-800 border border-emerald-100 shadow-sm shadow-emerald-100/80">
            Join Prakriti.AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-snug">
            Create your{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
              Prakriti.AI
            </span>{" "}
            account.
          </h1>
          <p className="text-sm text-slate-700 max-w-md">
            Register as a Citizen, Waste Worker, or Bulk Generator. Your account
            will be activated after verification by the city admin — keeping the
            platform trusted and clean.
          </p>

          <div
            className="
              mt-4 grid gap-3 text-xs text-slate-800
              rounded-3xl border border-emerald-100/80 bg-white/70 p-4
              shadow-md shadow-emerald-100/70 backdrop-blur-sm
            "
          >
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                👤
              </span>
              <div>
                <p className="font-semibold text-slate-900">Citizens</p>
                <p className="text-[0.7rem] text-slate-600">
                  Report local waste issues, track resolutions, and earn PCC for
                  climate-positive behaviour.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                🧹
              </span>
              <div>
                <p className="font-semibold text-slate-900">Waste Workers</p>
                <p className="text-[0.7rem] text-slate-600">
                  Claim nearby jobs, update status from the field, and close
                  reports with photo proof.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs shadow-sm shadow-emerald-200/80">
                🏢
              </span>
              <div>
                <p className="font-semibold text-slate-900">Bulk Generators</p>
                <p className="text-[0.7rem] text-slate-600">
                  Log segregation from societies, campuses and offices, and get
                  ready-made climate reports.
                </p>
              </div>
            </div>
          </div>

          <p className="text-[0.7rem] text-slate-500 max-w-md">
            By creating an account, you agree that your details may be used by
            the city administration to verify your role and track waste
            activity.
          </p>
        </section>

        {/* Right: glassy registration form */}
        <section
          className="
            md:w-1/2
            rounded-[1.75rem]
            border border-emerald-100/80
            bg-white/80
            shadow-xl shadow-emerald-200/70
            backdrop-blur-md
            p-5 sm:p-6
          "
        >
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
                        ? "border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-400/70"
                        : "border-emerald-100 bg-white/70 text-emerald-800 hover:bg-emerald-50"
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
                className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className="w-full rounded-xl border border-emerald-100/80 bg-white/70 px-3 py-2 text-sm shadow-sm shadow-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              className="
                mt-1 w-full rounded-full
                bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white
                shadow-sm shadow-emerald-400/70
                hover:bg-emerald-700
                disabled:opacity-60 disabled:cursor-not-allowed
                transition
              "
            >
              {submitting ? "Creating account..." : "Register with Prakriti.AI"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
