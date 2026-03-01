import { useEffect, useState } from "react";

import { fetchPlatformSettings, updatePlatformSettings } from "../../lib/api";
import type { PlatformSettings } from "../../lib/types";
import { useToast } from "../../components/ui/Toast";

export default function PlatformSettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [efJson, setEfJson] = useState("{}");
  const [qmJson, setQmJson] = useState("{}");

  const load = async () => {
    try {
      const res = await fetchPlatformSettings();
      setSettings(res);
      setEfJson(JSON.stringify(res.emission_factors, null, 2));
      setQmJson(JSON.stringify(res.quality_multipliers, null, 2));
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to load settings.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        pcc_unit_kgco2e: settings.pcc_unit_kgco2e,
        feature_flags: settings.feature_flags,
        emission_factors: JSON.parse(efJson),
        quality_multipliers: JSON.parse(qmJson),
      };
      const updated = await updatePlatformSettings(payload);
      setSettings(updated);
      push("success", "Platform settings updated.");
    } catch {
      push("error", "Invalid JSON or failed save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-card-strong rounded-3xl p-4 sm:p-5">
        <label className="block text-sm font-semibold text-slate-800">PCC Unit (1 PCC = X kgCO2e)</label>
        <input
          type="number"
          step="0.01"
          className="ui-input mt-2 max-w-xs"
          value={settings?.pcc_unit_kgco2e ?? 1}
          onChange={(e) => setSettings((p) => (p ? { ...p, pcc_unit_kgco2e: Number(e.target.value || 1) } : p))}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-800">Feature Flags</label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(settings?.feature_flags?.enable_training_modules)}
                onChange={(e) =>
                  setSettings((p) =>
                    p
                      ? {
                          ...p,
                          feature_flags: { ...p.feature_flags, enable_training_modules: e.target.checked },
                        }
                      : p
                  )
                }
              />
              Enable training modules
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(settings?.feature_flags?.enable_pcc_calculator)}
                onChange={(e) =>
                  setSettings((p) =>
                    p
                      ? {
                          ...p,
                          feature_flags: { ...p.feature_flags, enable_pcc_calculator: e.target.checked },
                        }
                      : p
                  )
                }
              />
              Enable PCC calculator
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-800">Emission Factors JSON</label>
            <textarea className="ui-input mt-2 min-h-[200px] font-mono text-xs" value={efJson} onChange={(e) => setEfJson(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800">Quality Multipliers JSON</label>
            <textarea className="ui-input mt-2 min-h-[200px] font-mono text-xs" value={qmJson} onChange={(e) => setQmJson(e.target.value)} />
          </div>
        </div>

        <button className="btn-primary mt-4" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
      </section>
    </div>
  );
}
