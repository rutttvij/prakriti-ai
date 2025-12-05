import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type Role = "CITIZEN" | "WASTE_WORKER" | "BULK_GENERATOR";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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
      if (mobile) meta.mobile = mobile;
      if (ward) meta.ward = ward;
      if (address) meta.address = address;
    }

    if (role === "WASTE_WORKER") {
      if (mobile) meta.mobile = mobile;
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Ward / Area
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Address / Landmark (optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Worker / Employee ID
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Ward / Zone Assigned
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Organization (e.g. Municipal Corporation)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Organization / Building Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={bulkOrgName}
              onChange={(e) => setBulkOrgName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type (Apartment / Hotel / Office / Institution)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Contact Mobile
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={bulkContactMobile}
              onChange={(e) => setBulkContactMobile(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Address / Ward
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
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

  return (
    <main className="flex justify-center px-4 py-10 bg-emerald-50/50 min-h-[calc(100vh-120px)]">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Create your Prakriti.AI account
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Register as a Citizen, Waste Worker, or Bulk Generator. Your account
            will be activated after verification by the city admin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm"
        >
          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Role
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="CITIZEN">Citizen</option>
              <option value="WASTE_WORKER">Waste Worker</option>
              <option value="BULK_GENERATOR">Bulk Generator</option>
            </select>
          </div>

          {/* Common fields */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Government ID (12-digit)
              </label>
              <input
                type="text"
                maxLength={12}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={governmentId}
                onChange={(e) => setGovernmentId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Pincode (6-digit)
              </label>
              <input
                type="text"
                maxLength={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Role-specific */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[0.7rem] font-semibold text-slate-500 mb-2">
              Additional details ({role.replace("_", " ")})
            </p>
            <div className="space-y-3">{renderRoleSpecificFields()}</div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Creating account..." : "Register"}
          </button>

          <p className="text-[0.7rem] text-slate-500 text-center">
            By creating an account, you agree that your details may be used by
            the city administration to verify your role and track waste
            activity.
          </p>
        </form>
      </div>
    </main>
  );
};

export default RegisterPage;
