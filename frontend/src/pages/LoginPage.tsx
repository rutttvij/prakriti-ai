import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

type UserRole = "CITIZEN" | "BULK_GENERATOR" | "WASTE_WORKER" | "SUPER_ADMIN";

interface MeResponse {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // 1) Perform login (store access_token via AuthContext / api)
      await login(email, password);

      // 2) Fetch /auth/me to get role and active status
      const meRes = await api.get<MeResponse>("/auth/me");
      const me = meRes.data;

      if (!me.is_active) {
        // Optional: block inactive accounts from logging in
        setError("Your account is not yet approved by the administrator.");
        // Clear token if you want to fully log them out
        localStorage.removeItem("access_token");
        setSubmitting(false);
        return;
      }

      // 3) Role-based redirect
      let target = "/dashboard";

      if (me.role === "SUPER_ADMIN") {
        target = "/admin";
      } else if (me.role === "WASTE_WORKER") {
        target = "/worker/dashboard";
      }

      navigate(target, { replace: true });
    } catch (err: any) {
      console.error(err);

      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed. Please check your email and password.";

      setError(detail);
      // Safety: clear any potentially invalid token
      localStorage.removeItem("access_token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      <div className="w-full max-w-md bg-white border border-emerald-100 rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
            ♻️
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-emerald-800">
            Prakriti.AI
          </h1>
          <p className="text-sm text-slate-500">
            Green &amp; clean waste intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-500 py-2.5 font-medium text-white hover:bg-emerald-600 transition disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-slate-500">
          Default demo credentials: <br />
          <span className="font-mono">user@example.com / user123</span>
        </p>
      </div>
    </div>
  );
}
