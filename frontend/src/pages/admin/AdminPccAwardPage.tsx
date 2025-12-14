// src/pages/admin/AdminPccAwardPage.tsx
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

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

interface SegregationLogDetail {
  id: number;
  score: number;
  pcc_awarded: boolean;
  recommended_pcc: number;
  created_at: string | null;
  log_date: string;
  household_id: number;
  waste_report_id: number | null;
  citizen: AwardResponseUser;
}

export const AdminPccAwardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const logIdParam = searchParams.get("logId");
  const logId = useMemo(() => {
    if (!logIdParam) return null;
    const n = parseInt(logIdParam, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [logIdParam]);

  const isSegregationMode = !!logId;

  const [segLog, setSegLog] = useState<SegregationLogDetail | null>(null);
  const [segLoading, setSegLoading] = useState(false);
  const [segError, setSegError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [tokens, setTokens] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    if (!logId) {
      setSegLog(null);
      setSegError(null);
      setSegLoading(false);
      return;
    }

    const fetchLog = async () => {
      setSegLoading(true);
      setSegError(null);
      setSegLog(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/segregation/logs/${logId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || "Failed to load segregation log.");
        }

        const data = (await res.json()) as SegregationLogDetail;
        setSegLog(data);

        setUserId(String(data.citizen.id));
        setTokens(data.recommended_pcc ? String(data.recommended_pcc) : "");
        setReason(`Segregation reward · Log #${data.id} · Score ${data.score}`);
      } catch (e: any) {
        setSegError(e?.message || "Error loading segregation log.");
      } finally {
        setSegLoading(false);
      }
    };

    fetchLog();
  }, [logId]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (!logId) {
      setSegLog(null);
      setSegError(null);
      setSegLoading(false);
    }
  }, [logId]);

  const submitManual = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedUserId = parseInt(userId, 10);
    const parsedTokens = parseFloat(tokens);

    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
      setError("Please enter a valid user ID.");
      return;
    }
    if (!Number.isFinite(parsedTokens) || parsedTokens <= 0) {
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
        `Awarded ${parsedTokens.toFixed(1)} PCC to ${data.user.email}. New balance: ${data.new_balance.toFixed(1)}.`,
      );
      setUserId("");
      setTokens("");
      setReason("");
    } catch (err: any) {
      setError(err?.message || "Error awarding PCC tokens.");
    } finally {
      setLoading(false);
    }
  };

  const submitSegregationAward = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!logId) {
      setError("No segregation log selected. Open this page with ?logId=123.");
      return;
    }

    const parsedTokens = parseFloat(tokens);
    if (!Number.isFinite(parsedTokens) || parsedTokens <= 0) {
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
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/segregation/logs/${logId}/award-pcc`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pcc_tokens: parsedTokens,
            reason: reason.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to award PCC for log.");
      }

      const data = (await res.json()) as {
        awarded_pcc: number;
        new_balance: number;
      };

      setSuccess(
        `Awarded ${data.awarded_pcc.toFixed(1)} PCC for segregation log #${logId}. Citizen new balance: ${data.new_balance.toFixed(1)}.`,
      );

      setSegLog((prev) =>
        prev
          ? {
              ...prev,
              pcc_awarded: true,
            }
          : prev,
      );
    } catch (err: any) {
      setError(err?.message || "Error awarding PCC for log.");
    } finally {
      setLoading(false);
    }
  };

  const activeSubmit = isSegregationMode ? submitSegregationAward : submitManual;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <div className="relative space-y-5">
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
              Award PCC either manually or against a segregation log.
            </p>
          </div>
        </header>

        {isSegregationMode && (
          <section
            className="
              max-w-3xl
              rounded-[1.8rem]
              border border-emerald-100/80
              bg-white/80
              px-5 py-4
              shadow-md shadow-emerald-100/70
              backdrop-blur-sm
            "
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Segregation log context
                </h2>
                <p className="text-[0.7rem] text-slate-500">
                  This section auto-fills the citizen + recommended PCC.
                </p>
              </div>
              <div className="text-[0.7rem] text-slate-600">
                <span className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1">
                  Log #{logId}
                </span>
              </div>
            </div>

            {segLoading && (
              <div className="mt-3 text-xs text-slate-600">Loading log…</div>
            )}

            {segError && (
              <div
                className="
                  mt-3 rounded-2xl border border-red-100/80
                  bg-red-50/90 px-3 py-2 text-xs text-red-700
                "
              >
                {segError}
              </div>
            )}

            {segLog && (
              <div className="mt-3 grid gap-3 text-[0.75rem] text-slate-700 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3">
                  <div className="text-[0.65rem] text-slate-500">Citizen</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {segLog.citizen.full_name || segLog.citizen.email}
                  </div>
                  <div className="mt-1 text-[0.65rem] text-slate-500">
                    User ID: {segLog.citizen.id}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3">
                  <div className="text-[0.65rem] text-slate-500">Score</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {segLog.score}
                  </div>
                  <div className="mt-1 text-[0.65rem] text-slate-500">
                    Recommended PCC: {segLog.recommended_pcc.toFixed(1)}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3">
                  <div className="text-[0.65rem] text-slate-500">Household</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    #{segLog.household_id}
                  </div>
                  <div className="mt-1 text-[0.65rem] text-slate-500">
                    Log date: {new Date(segLog.log_date).toLocaleDateString()}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3">
                  <div className="text-[0.65rem] text-slate-500">
                    Award status
                  </div>
                  <div className="mt-1 font-semibold">
                    {segLog.pcc_awarded ? (
                      <span className="text-emerald-700">Already awarded</span>
                    ) : (
                      <span className="text-amber-700">Pending</span>
                    )}
                  </div>
                  <div className="mt-1 text-[0.65rem] text-slate-500">
                    Waste report: {segLog.waste_report_id ?? "—"}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

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
          <form onSubmit={activeSubmit} className="space-y-4">
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
                    disabled:opacity-70
                  "
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 42"
                  disabled={isSegregationMode}
                />
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  {isSegregationMode
                    ? "Auto-filled from segregation log."
                    : "Find this in the Users & approvals list."}
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
                Reason (recommended)
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
                placeholder="Segregation reward / event / correction / audit note…"
              />
            </div>

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
                disabled={
                  loading ||
                  (isSegregationMode &&
                    (!!segLog?.pcc_awarded || !logId || segLoading))
                }
                className="
                  inline-flex items-center justify-center
                  rounded-full bg-emerald-700
                  px-6 py-2.5 text-sm font-semibold text-white
                  shadow-sm shadow-emerald-400/60
                  hover:bg-emerald-800
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {loading
                  ? "Awarding…"
                  : isSegregationMode
                    ? "Award PCC for segregation log"
                    : "Award PCC tokens"}
              </button>

              <p className="text-[0.7rem] text-slate-500">
                {isSegregationMode
                  ? "Awards are locked to one award per log."
                  : "Manual awards are logged in the carbon ledger."}
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
