import { useMemo } from "react";

import { Dialog } from "../../ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  referenceLabel: string;
  pccStatus: string;
  weightKg: number;
  wasteCategory?: string | null;
  qualityLevel?: string | null;
  qualityScore?: number | null;
  evidenceImageUrl?: string | null;
  pccPreview?: number | null;
  awardedAmount?: number | null;
  awardDisabled?: boolean;
  revokeDisabled?: boolean;
  loading?: boolean;
  onAward: () => void;
  onRevoke: () => void;
};

export default function AwardDrawer({
  open,
  onClose,
  title,
  referenceLabel,
  pccStatus,
  weightKg,
  wasteCategory,
  qualityLevel,
  qualityScore,
  evidenceImageUrl,
  pccPreview,
  awardedAmount,
  awardDisabled,
  revokeDisabled,
  loading,
  onAward,
  onRevoke,
}: Props) {
  const canAward = pccStatus === "pending" && !awardDisabled;
  const canRevoke = pccStatus === "awarded" && !revokeDisabled;

  const statusClass = useMemo(() => {
    if (pccStatus === "awarded") return "bg-emerald-100 text-emerald-800";
    if (pccStatus === "revoked") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
  }, [pccStatus]);

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-100/70 bg-white/40 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{referenceLabel}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>{pccStatus}</span>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p>Category: <span className="font-medium text-slate-900">{wasteCategory || "mixed"}</span></p>
            <p>Weight: <span className="font-medium text-slate-900">{Number(weightKg || 0).toFixed(2)} kg</span></p>
            <p>Quality level: <span className="font-medium capitalize text-slate-900">{qualityLevel || "medium"}</span></p>
            <p>Quality score: <span className="font-medium text-slate-900">{qualityScore ?? "-"}</span></p>
            <p>Computed PCC preview: <span className="font-semibold text-emerald-700">{pccPreview != null ? pccPreview.toFixed(2) : "-"}</span></p>
            <p>Awarded PCC: <span className="font-semibold text-slate-900">{awardedAmount != null ? awardedAmount.toFixed(2) : "-"}</span></p>
          </div>
        </div>

        {evidenceImageUrl ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence</p>
            <img src={evidenceImageUrl} alt="Evidence" className="max-h-60 w-full rounded-2xl border border-emerald-100 object-cover" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button className="btn-primary" onClick={onAward} disabled={!canAward || loading}>
            {loading ? "Processing..." : "Award PCC"}
          </button>
          <button className="btn-secondary" onClick={onRevoke} disabled={!canRevoke || loading}>
            Revoke PCC
          </button>
        </div>
      </div>
    </Dialog>
  );
}
