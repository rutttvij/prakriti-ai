import { type FormEvent, useState } from "react";
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
        setError("Your account is not yet approved by the administrator.");
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
      localStorage.removeItem("access_token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="
        relative flex-1
        flex items-center justify-center
        bg-gradient-to-b from-emerald-50 via-emerald-50 to-slate-50
        overflow-hidden px-4 py-10
      "
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-72 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-80" />
      <div className="pointer-events-none absolute -right-40 top-24 h-64 w-64 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Glass card */}
      <div
        className="
          relative w-full max-w-md
          rounded-[1.75rem]
          border border-emerald-100/80
          bg-white/80
          px-6 py-7 sm:px-8 sm:py-9
          shadow-xl shadow-emerald-100/70
          backdrop-blur-xl
        "
      >
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-xl font-bold text-white shadow-md shadow-emerald-300/60">
            ♻️
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-[0.18em] text-slate-900 uppercase">
            Prakriti
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">
              .AI
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Clean city. Smart waste. Log in to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              className="
                w-full rounded-xl
                border border-emerald-100/80
                bg-white/80
                px-3 py-2.5 text-sm text-slate-900
                placeholder:text-slate-400
                shadow-sm shadow-emerald-50
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
              "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              className="
                w-full rounded-xl
                border border-emerald-100/80
                bg-white/80
                px-3 py-2.5 text-sm text-slate-900
                placeholder:text-slate-400
                shadow-sm shadow-emerald-50
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="
              mt-1 w-full
              rounded-full bg-emerald-700
              px-5 py-2.5 text-sm font-semibold text-white
              shadow-sm shadow-emerald-400/70
              hover:bg-emerald-800
              transition
              disabled:opacity-60 disabled:cursor-not-allowed
            "
          >
            {submitting ? "Logging in…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-[0.7rem] text-center text-slate-500">
          Demo credentials:{" "}
          <span className="font-mono text-slate-700">
            user@example.com / user123
          </span>
        </p>
      </div>
    </main>
  );
}
