import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import {
  createCitizenHousehold,
  fetchCitizenHouseholds,
  linkCitizenHousehold,
  makeCitizenHouseholdPrimary,
  updateCitizenHousehold,
} from "../../lib/api";
import type { CitizenHousehold } from "../../lib/types";

type Mode = "create" | "edit";

const EMPTY_FORM = {
  name: "",
  city: "",
  ward_zone: "",
  address: "",
  pincode: "",
};

export default function CitizenHouseholdPage() {
  const [items, setItems] = useState<CitizenHousehold[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [makePrimary, setMakePrimary] = useState(true);
  const [linkHouseholdId, setLinkHouseholdId] = useState("");

  const primary = useMemo(() => items.find((x) => x.is_primary) ?? null, [items]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCitizenHouseholds();
      setItems(data);
      if (data.length > 0) {
        const initial = data.find((x) => x.is_primary) ?? data[0];
        setMode("edit");
        setSelectedId(initial.id);
        setForm({
          name: initial.name || "",
          city: initial.city || "",
          ward_zone: initial.ward_zone || "",
          address: initial.address || "",
          pincode: initial.pincode || "",
        });
        setMakePrimary(Boolean(initial.is_primary));
      } else {
        setMode("create");
        setSelectedId(null);
        setForm(EMPTY_FORM);
        setMakePrimary(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load households.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectItem = (item: CitizenHousehold) => {
    setMode("edit");
    setSelectedId(item.id);
    setForm({
      name: item.name || "",
      city: item.city || "",
      ward_zone: item.ward_zone || "",
      address: item.address || "",
      pincode: item.pincode || "",
    });
    setMakePrimary(Boolean(item.is_primary));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    if (!form.name.trim() || !form.city.trim()) {
      setError("Name and city are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await createCitizenHousehold({
          ...form,
          name: form.name.trim(),
          city: form.city.trim(),
          make_primary: makePrimary,
        });
        if (makePrimary && !created.is_primary) {
          await makeCitizenHouseholdPrimary(created.id);
        }
        setSuccess("Household created.");
      } else if (selectedId) {
        await updateCitizenHousehold(selectedId, {
          ...form,
          name: form.name.trim(),
          city: form.city.trim(),
        });
        if (makePrimary) {
          await makeCitizenHouseholdPrimary(selectedId);
        }
        setSuccess("Household updated.");
      }
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not save household.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const id = Number(linkHouseholdId);
    if (!id) {
      setError("Enter a valid household ID.");
      return;
    }
    setSubmitting(true);
    try {
      await linkCitizenHousehold(id);
      setLinkHouseholdId("");
      setSuccess("Household linked.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not link household.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · HOME"
        title="Home & household"
        subtitle="Manage your household locations, link existing IDs, and set the primary household for reporting and segregation insights."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <form onSubmit={handleSave} className="surface-card-strong rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{mode === "create" ? "Add household" : "Edit household"}</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMode("create");
                setSelectedId(null);
                setForm(EMPTY_FORM);
                setMakePrimary(items.length === 0);
              }}
            >
              Add new location
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
            <input
              className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
              placeholder="Ward / Zone"
              value={form.ward_zone}
              onChange={(e) => setForm((p) => ({ ...p, ward_zone: e.target.value }))}
            />
            <input
              className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
              placeholder="Pincode"
              value={form.pincode}
              onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
            />
          </div>

          <textarea
            rows={3}
            className="w-full rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={makePrimary} onChange={(e) => setMakePrimary(e.target.checked)} />
            Make primary
          </label>

          {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

          <button type="submit" className="btn-primary" disabled={submitting || loading}>
            {submitting ? "Saving..." : mode === "create" ? "Create household" : "Save changes"}
          </button>
        </form>

        <div className="space-y-4">
          <form onSubmit={handleLink} className="surface-card-strong rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Link existing household</h3>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
                placeholder="Household ID"
                value={linkHouseholdId}
                onChange={(e) => setLinkHouseholdId(e.target.value)}
              />
              <button type="submit" className="btn-secondary" disabled={submitting}>
                Link
              </button>
            </div>
          </form>

          <div className="surface-card-strong rounded-3xl p-5">
            <p className="text-xs text-slate-500">Primary household</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{primary?.name || "Not set"}</p>
            <p className="text-sm text-slate-600">{primary?.city || ""} {primary?.ward_zone ? `· ${primary.ward_zone}` : ""}</p>
          </div>
        </div>
      </div>

      <div className="surface-card-strong rounded-3xl p-5">
        <h3 className="text-xl font-semibold text-slate-900">{loading ? "Loading..." : `${items.length} household${items.length === 1 ? "" : "s"} in view`}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="py-2">Name</th>
                <th>City</th>
                <th>Ward</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/50">
                  <td className="py-3 font-medium text-slate-900">{item.name}</td>
                  <td>{item.city || "-"}</td>
                  <td>{item.ward_zone || "-"}</td>
                  <td>
                    <span className={`rounded-full px-2 py-1 text-xs ${item.is_primary ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                      {item.is_primary ? "Primary" : "Linked"}
                    </span>
                  </td>
                  <td className="space-x-2">
                    <button type="button" className="btn-secondary" onClick={() => selectItem(item)}>
                      Edit
                    </button>
                    {!item.is_primary && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          try {
                            await makeCitizenHouseholdPrimary(item.id);
                            await load();
                            setSuccess("Primary household updated.");
                          } catch (e: any) {
                            setError(e?.response?.data?.detail || "Could not set primary household.");
                          }
                        }}
                      >
                        Make primary
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-slate-500" colSpan={5}>
                    No households yet. Add your first location to continue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
