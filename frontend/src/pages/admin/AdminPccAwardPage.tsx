// src/pages/admin/AdminPccAwardPage.tsx

import { type FormEvent, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getAuthToken = () => localStorage.getItem("access_token");

interface AwardResponseUser {
  id: number;
  email: string;
  full_name: string | null;
  pcc_balance?: number;
}

interface AwardResponse {
  user: AwardResponseUser;
  new_balance: number;
}

export const AdminPccAwardPage: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [tokens, setTokens] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedUserId = parseInt(userId, 10);
    const parsedTokens = parseFloat(tokens);

    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      setError("Please enter a valid user ID.");
      return;
    }
    if (isNaN(parsedTokens) || parsedTokens <= 0) {
      setError("Please enter a positive PCC token amount.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Not authenticated.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/pcc/award`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: parsedUserId,
          tokens: parsedTokens,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to award PCC tokens.");
      }

      const data = (await res.json()) as AwardResponse;

      setSuccess(
        `Awarded ${parsedTokens.toFixed(
          1
        )} PCC to ${data.user.email}. New balance: ${data.new_balance.toFixed(
          1
        )}.`
      );
      setUserId("");
      setTokens("");
      setReason("");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Error awarding PCC tokens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* soft emerald glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <div className="relative space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-white/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-800 shadow-sm shadow-emerald-100/80 backdrop-blur-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Super Admin · PCC Tokens
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              PCC token console
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Manually award PCC tokens for pilots, events or corrections. Use
              sparingly and keep a short note for audit.
            </p>
          </div>

          <div className="mt-1 rounded-2xl border border-emerald-100/80 bg-white/80 px-3 py-2 text-[0.7rem] text-slate-600 shadow-sm shadow-emerald-100/80 backdrop-blur-sm max-w-xs">
            <p className="font-semibold text-slate-900 mb-1">
              Quick tips for safe awards
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Confirm user ID from Users panel.</li>
              <li>Record event name in the reason field.</li>
              <li>Use decimals for partial PCC (e.g. 2.5).</li>
            </ul>
          </div>
        </header>

        {/* Form card */}
        <section
          className="
            max-w-xl
            rounded-[1.8rem]
            border border-emerald-100/80
            bg-white/80
            px-5 py-5
            shadow-md shadow-emerald-100/70
            backdrop-blur-sm
          "
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-medium text-slate-600">
                  User ID
                </label>
                <input
                  type="number"
                  className="
                    w-full rounded-xl border border-emerald-100/80
                    bg-white/80 px-3 py-2 text-sm
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 42"
                />
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  Find this in the Users &amp; approvals list.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[0.7rem] font-medium text-slate-600">
                  PCC tokens
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="
                    w-full rounded-xl border border-emerald-100/80
                    bg-white/80 px-3 py-2 text-sm
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                  placeholder="e.g. 10"
                />
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  Use decimals for partial awards (e.g. 1.5 PCC).
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.7rem] font-medium text-slate-600">
                Reason (optional but recommended)
              </label>
              <textarea
                className="
                  w-full rounded-2xl border border-emerald-100/80
                  bg-white/80 px-3 py-2 text-sm
                  shadow-sm shadow-emerald-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                "
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Green volunteer drive, school clean-up, correction for missed tokens, etc."
              />
            </div>

            {/* Alerts */}
            {error && (
              <div
                className="
                  rounded-2xl border border-red-100/80
                  bg-red-50/90 px-3 py-2
                  text-xs text-red-700
                  shadow-sm shadow-red-100
                "
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="
                  rounded-2xl border border-emerald-100/80
                  bg-emerald-50/90 px-3 py-2
                  text-xs text-emerald-700
                  shadow-sm shadow-emerald-100
                "
              >
                {success}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="
                  inline-flex items-center justify-center
                  rounded-full bg-emerald-700
                  px-6 py-2.5 text-sm font-semibold text-white
                  shadow-sm shadow-emerald-400/60
                  hover:bg-emerald-800
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {loading ? "Awarding…" : "Award PCC tokens"}
              </button>

              <p className="text-[0.7rem] text-slate-500">
                Awards are logged in the carbon ledger alongside automated PCC
                from segregation.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
