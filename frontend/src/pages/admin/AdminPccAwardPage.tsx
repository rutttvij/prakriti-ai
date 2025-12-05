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
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-800">PCC Token Console</h1>
        <p className="text-xs text-slate-500">
          Manually award PCC tokens for special initiatives, events, or
          corrections.
        </p>
      </header>

      <section className="rounded-xl border border-emerald-100 bg-white p-4 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              User ID
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              PCC Tokens
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>

          <div>
            <label className="block text-[0.7rem] font-medium text-slate-600 mb-1">
              Reason (optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Green volunteer event, school drive, etc."
            />
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
            disabled={loading}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Awarding…" : "Award PCC Tokens"}
          </button>
        </form>
      </section>
    </div>
  );
};
