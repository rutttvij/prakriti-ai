import { useEffect, useMemo, useState } from "react";

import AwardDrawer from "../../components/admin/pcc/AwardDrawer";
import RevokeDialog from "../../components/admin/pcc/RevokeDialog";
import { useToast } from "../../components/ui/Toast";
import {
  awardAdminPcc,
  bulkAwardAdminPcc,
  fetchAdminBulkGeneratorLogs,
  fetchAdminPccEmissionFactors,
  fetchAdminPccSettings,
  revokeAdminPcc,
} from "../../lib/api";
import type { BulkGeneratorLogItem, EmissionFactorItem, PccSettings } from "../../lib/types";
import { useAuth } from "../../contexts/AuthContext";

function canManageAwards(role?: string, meta?: Record<string, unknown>) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "WASTE_WORKER") {
    return Boolean(meta?.is_verified || meta?.verified || String(meta?.verification_status || "").toLowerCase() === "verified");
  }
  return false;
}

function normalizeCategory(v?: string | null) {
  const x = (v || "mixed").toLowerCase();
  if (x === "wet") return "organic";
  if (x === "dry") return "mixed";
  if (x === "ewaste") return "e-waste";
  return x;
}

function computePreview(item: BulkGeneratorLogItem | null, settings: PccSettings | null, factors: EmissionFactorItem[]) {
  if (!item || !settings) return null;
  const factor = factors.find((f) => f.active && f.waste_category.toLowerCase() === normalizeCategory(item.waste_category))?.kgco2e_per_kg;
  if (!factor || !item.weight_kg || settings.pcc_unit_kgco2e <= 0) return null;
  const level = (item.quality_level || "medium").toLowerCase();
  const multiplier = settings.quality_multipliers[level] ?? 1;
  const co2e = item.weight_kg * factor * multiplier;
  return Math.round((co2e / settings.pcc_unit_kgco2e) * 100) / 100;
}

export default function BulkGeneratorLogsPage() {
  const { push } = useToast();
  const { user } = useAuth();

  const [rows, setRows] = useState<BulkGeneratorLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [active, setActive] = useState<BulkGeneratorLogItem | null>(null);
  const [acting, setActing] = useState(false);
  const [settings, setSettings] = useState<PccSettings | null>(null);
  const [factors, setFactors] = useState<EmissionFactorItem[]>([]);

  const [filters, setFilters] = useState({ q: "", verification_status: "", pcc_status: "", date_from: "", date_to: "" });

  const canAct = canManageAwards(user?.role, (user?.meta || {}) as Record<string, unknown>);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminBulkGeneratorLogs({
        q: filters.q || undefined,
        verification_status: filters.verification_status || undefined,
        pcc_status: filters.pcc_status || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        page: 1,
        page_size: 100,
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load bulk logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const [s, ef] = await Promise.all([fetchAdminPccSettings(), fetchAdminPccEmissionFactors()]);
        setSettings(s);
        setFactors(ef || []);
      } catch {
        setSettings({ pcc_unit_kgco2e: 10, quality_multipliers: { low: 0.8, medium: 1.0, high: 1.1 }, updated_at: new Date().toISOString() });
        setFactors([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = useMemo(() => computePreview(active, settings, factors), [active, settings, factors]);

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onAwardSingle = async (row: BulkGeneratorLogItem) => {
    if (!canAct) return;
    setActing(true);
    try {
      const res: any = await awardAdminPcc({ reference_type: "bulk_log", reference_id: row.id });
      const awarded = Number(res?.amount ?? res?.awarded_pcc ?? 0);
      push("success", `Awarded ${Number.isFinite(awarded) ? awarded.toFixed(2) : "0.00"} PCC.`);
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to award PCC.");
    } finally {
      setActing(false);
    }
  };

  const onBulkAward = async () => {
    if (!canAct || selectedIds.length === 0) return;
    setActing(true);
    try {
      const res: any = await bulkAwardAdminPcc(selectedIds.map((id) => ({ reference_type: "bulk_log", reference_id: id })));
      const awardedCount = Array.isArray(res?.awarded) ? res.awarded.length : 0;
      const skippedCount = Array.isArray(res?.skipped) ? res.skipped.length : 0;
      push("success", `Awarded: ${awardedCount}, Skipped: ${skippedCount}`);
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Bulk award failed.");
    } finally {
      setActing(false);
    }
  };

  const onRevoke = async (reason?: string) => {
    if (!active || !canAct) return;
    setActing(true);
    try {
      const res: any = await revokeAdminPcc({ reference_type: "bulk_log", reference_id: active.id, reason });
      const revoked = Number(res?.amount ?? 0);
      push("success", `Revoked ${Number.isFinite(revoked) ? revoked.toFixed(2) : "0.00"} PCC.`);
      setRevokeOpen(false);
      setDrawerOpen(false);
      await load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to revoke PCC.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/20 bg-slate-950/26 p-5 shadow-[0_24px_50px_rgba(5,22,27,0.38)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/16 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-emerald-100">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Super Admin · Bulk logs
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight !text-[#dffaf0]">Bulk generator logs</h1>
        <p className="mt-1 text-sm text-emerald-100">Award only verified logs, revoke with debit, and review carbon-based PCC preview.</p>
      </section>

      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <div className="grid gap-2 md:grid-cols-7">
          <input className="ui-input md:col-span-2" placeholder="Search org / user" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
          <select className="ui-input" value={filters.verification_status} onChange={(e) => setFilters((p) => ({ ...p, verification_status: e.target.value }))}>
            <option value="">All verification</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="ui-input" value={filters.pcc_status} onChange={(e) => setFilters((p) => ({ ...p, pcc_status: e.target.value }))}>
            <option value="">All PCC status</option>
            <option value="pending">Pending</option>
            <option value="awarded">Awarded</option>
            <option value="revoked">Revoked</option>
          </select>
          <input type="datetime-local" className="ui-input" value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
          <input type="datetime-local" className="ui-input" value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
          <button className="btn-primary" onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">{total} logs in view</p>
          <button className="btn-secondary" onClick={onBulkAward} disabled={!canAct || selectedIds.length === 0 || acting}>Award Selected ({selectedIds.length})</button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-emerald-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2" />
                <th className="px-2 py-2 text-left">Log</th>
                <th className="px-2 py-2 text-left">Organization</th>
                <th className="px-2 py-2 text-left">Category</th>
                <th className="px-2 py-2 text-left">Weight</th>
                <th className="px-2 py-2 text-left">Verification</th>
                <th className="px-2 py-2 text-left">PCC status</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const eligible = row.verification_status === "verified" && row.pcc_status === "pending";
                return (
                  <tr key={row.id} className="border-b border-emerald-100/70 hover:bg-white/35">
                    <td className="px-2 py-2"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} disabled={!eligible || !canAct} /></td>
                    <td className="px-2 py-2 font-medium text-slate-900">#{row.id}</td>
                    <td className="px-2 py-2">{row.org_name || `User #${row.user_id}`}</td>
                    <td className="px-2 py-2">{row.waste_category || "mixed"}</td>
                    <td className="px-2 py-2">{Number(row.weight_kg || 0).toFixed(2)} kg</td>
                    <td className="px-2 py-2"><span className="rounded-full bg-white/70 px-2 py-1 text-xs capitalize">{row.verification_status}</span></td>
                    <td className="px-2 py-2"><span className="rounded-full bg-white/70 px-2 py-1 text-xs capitalize">{row.pcc_status}</span></td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        {row.pcc_status === "pending" ? (
                          <button className="btn-primary" onClick={() => onAwardSingle(row)} disabled={!eligible || !canAct || acting}>Award</button>
                        ) : row.pcc_status === "awarded" ? (
                          <button className="btn-secondary" onClick={() => { setActive(row); setRevokeOpen(true); }} disabled={!canAct || acting}>Revoke</button>
                        ) : null}
                        <button className="btn-secondary" onClick={() => { setActive(row); setDrawerOpen(true); }}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-slate-500">No logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AwardDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Bulk log details"
        referenceLabel={active ? `Bulk log #${active.id}` : "Bulk log"}
        pccStatus={active?.pcc_status || "pending"}
        weightKg={active?.weight_kg || 0}
        wasteCategory={active?.waste_category}
        qualityLevel={active?.quality_level}
        qualityScore={null}
        pccPreview={preview}
        awardedAmount={active?.awarded_pcc_amount}
        loading={acting}
        awardDisabled={!canAct || active?.verification_status !== "verified"}
        revokeDisabled={!canAct}
        onAward={() => active && onAwardSingle(active)}
        onRevoke={() => setRevokeOpen(true)}
      />

      <RevokeDialog open={revokeOpen} onClose={() => setRevokeOpen(false)} loading={acting} onConfirm={onRevoke} />
    </div>
  );
}
