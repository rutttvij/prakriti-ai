import { type FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

type UserRole =
  | "CITIZEN"
  | "BULK_GENERATOR"
  | "BULK_MANAGER"
  | "BULK_STAFF"
  | "WASTE_WORKER"
  | "SUPER_ADMIN";

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
      } else if (
        me.role === "BULK_GENERATOR" ||
        me.role === "BULK_MANAGER" ||
        me.role === "BULK_STAFF"
      ) {
        target = "/bulk/dashboard";
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
    <main className="relative min-h-screen landing-aurora overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute left-[12%] top-[8%] h-80 w-80 rounded-full bg-emerald-200/28 blur-[130px]" />
      <div className="pointer-events-none absolute right-[10%] top-[12%] h-72 w-72 rounded-full bg-cyan-200/22 blur-[125px]" />
      <div className="pointer-events-none absolute left-[28%] bottom-[8%] h-72 w-72 rounded-full bg-emerald-300/14 blur-[130px]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="rounded-[2rem] border border-white/20 bg-slate-950/26 p-8 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/95">
              Civic Intelligence Platform
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[0.95] text-white">
              Sign in to run verified
              <br />
              city waste operations.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#dffaf0]">
              Coordinate reports, workforce workflows, and measurable carbon impact
              from one accountable operating layer.
            </p>

            <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
              {[
                { k: "Capture", v: "Events logged with context" },
                { k: "Verify", v: "Evidence-backed closures" },
                { k: "Reward", v: "PCC issued from proof" },
              ].map((item) => (
                <div key={item.k} className="rounded-2xl border border-white/28 bg-white/12 p-3 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">{item.k}</p>
                  <p className="mt-1 text-xs text-emerald-50/90">{item.v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card-strong relative mx-auto w-full max-w-md px-6 py-7 sm:px-8 sm:py-9">
          <p className="mb-3 text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-700 lg:hidden">
            Civic Intelligence Platform
          </p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                className="ui-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                className="ui-input"
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
              className="btn-primary mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="mt-4 text-[0.7rem] text-center text-slate-500">
            Demo credentials:{" "}
            <span className="font-mono text-slate-700">user@example.com / user123</span>
          </p>

          <p className="mt-2 text-center text-xs text-slate-600">
            New to Prakriti.AI?{" "}
            <Link to="/auth/register" className="font-semibold text-emerald-700 hover:text-emerald-800">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
