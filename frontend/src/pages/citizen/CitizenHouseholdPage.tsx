import { type FormEvent, useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Household } from "../../types/household";

type SelectedId = number | "new" | null;

function sortHouseholds(households: Household[]) {
  return [...households].sort((a, b) => {
    if (a.is_primary === b.is_primary) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return a.is_primary ? -1 : 1; // primary first
  });
}

export default function CitizenHouseholdPage() {
  const { user } = useAuth();

  // Restrict to citizens only
  if (user && user.role !== "CITIZEN") {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-emerald-50/70 to-white flex items-center -m-4 p-4 md:p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-100 bg-white/80 shadow-sm p-6">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
            Household profile
          </span>
          <h1 className="text-2xl font-semibold text-emerald-900 mb-2">
            Citizens only
          </h1>
          <p className="text-sm text-slate-600">
            This page is meant for{" "}
            <span className="font-semibold text-emerald-800">citizens</span> to
            manage their home address and link to a household. Please switch to
            a citizen account if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for create/update
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const [saving, setSaving] = useState(false);

  // Link by ID
  const [linkId, setLinkId] = useState("");
  const [linking, setLinking] = useState(false);

  // Which household are we editing? (or "new" for create)
  const [selectedId, setSelectedId] = useState<SelectedId>("new");

  const primaryHousehold = useMemo(
    () => households.find((h) => h.is_primary) ?? null,
    [households]
  );

  const selectedHousehold = useMemo(
    () =>
      typeof selectedId === "number"
        ? households.find((h) => h.id === selectedId) ?? null
        : null,
    [households, selectedId]
  );

  async function loadHouseholds() {
    try {
      setLoading(true);
      const res = await api.get<Household[]>("/segregation/households/me");
      const sorted = sortHouseholds(res.data);
      setHouseholds(sorted);

      if (sorted.length > 0) {
        const primary = sorted.find((h) => h.is_primary) ?? sorted[0];
        setSelectedId(primary.id);
        setName(primary.name ?? "");
        setAddress(primary.address ?? "");
        setWard(primary.ward ?? "");
        setCity(primary.city ?? "");
        setPincode(primary.pincode ?? "");
      } else {
        // No households yet – show blank create form
        setSelectedId("new");
        setName("");
        setAddress("");
        setWard("");
        setCity("");
        setPincode("");
      }
    } catch (err) {
      console.error(err);
      setError("Could not load your household information.");
    } finally {
      setLoading(false);
    }
  }

  // Load households on mount
  useEffect(() => {
    loadHouseholds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFormForNew() {
    setSelectedId("new");
    setName("");
    setAddress("");
    setWard("");
    setCity("");
    setPincode("");
  }

  function fillFormFromHousehold(h: Household) {
    setName(h.name ?? "");
    setAddress(h.address ?? "");
    setWard(h.ward ?? "");
    setCity(h.city ?? "");
    setPincode(h.pincode ?? "");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please add a name for your home or building.");
      return;
    }

    const payload = {
      name: name.trim(),
      address: address.trim() || undefined,
      ward: ward.trim() || undefined,
      city: city.trim() || undefined,
      pincode: pincode.trim() || undefined,
      is_bulk_generator: false,
      // Let backend auto-decide primary; we don't force it here
      // is_primary: households.length === 0 ? true : undefined,
    };

    try {
      setSaving(true);

      let res;
      if (typeof selectedId === "number") {
        // Update existing household
        res = await api.put<Household>(
          `/segregation/households/${selectedId}`,
          payload
        );
      } else {
        // Create new household
        res = await api.post<Household>("/segregation/households", payload);
      }

      setHouseholds((prev) => {
        const others = prev.filter((h) => h.id !== res.data.id);
        return sortHouseholds([res.data, ...others]);
      });

      setSelectedId(res.data.id);
    } catch (err) {
      console.error(err);
      setError("Could not save your household. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const idNum = Number(linkId);
    if (!idNum || Number.isNaN(idNum)) {
      setError("Please enter a valid household ID.");
      return;
    }

    try {
      setLinking(true);
      const res = await api.post<Household>("/segregation/households/link", {
        household_id: idNum,
      });

      setHouseholds((prev) => {
        const others = prev.filter((h) => h.id !== res.data.id);
        return sortHouseholds([res.data, ...others]);
      });

      setSelectedId(res.data.id);
      fillFormFromHousehold(res.data);
      setLinkId("");
    } catch (err: any) {
      console.error(err);
      const message =
        (err?.response?.data?.detail as string | undefined) ||
        "Could not link this household. Please check the ID and try again.";
      setError(message);
    } finally {
      setLinking(false);
    }
  }

  async function handleMakePrimary(id: number) {
    try {
      setError(null);
      await api.post<Household>(
        `/segregation/households/${id}/make-primary`,
        {}
      );
      await loadHouseholds();
      setSelectedId(id);
    } catch (err) {
      console.error(err);
      setError("Could not set this household as primary. Please try again.");
    }
  }

  function handleSelectHousehold(id: number) {
    const h = households.find((hh) => hh.id === id);
    if (!h) return;
    setSelectedId(id);
    fillFormFromHousehold(h);
  }

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-emerald-50/70 to-white -m-4 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-2">
            Citizen · Home & Household
          </span>
          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-900">
            Your home profile
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Link your account to your home, office, or other locations so we can
            show you segregation quality, PCC rewards, and community impact for
            your exact places.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-[1.2fr,1fr]">
          {/* Address form */}
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-emerald-900">
                  {typeof selectedId === "number"
                    ? "Edit household / location"
                    : "Add a new household / location"}
                </h2>
                {!loading && primaryHousehold && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Primary household:{" "}
                    <span className="font-medium text-emerald-800">
                      {primaryHousehold.name}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={resetFormForNew}
                className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
              >
                + Add new location
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-600">Loading your details…</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Name of home / building
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      placeholder="e.g. Green Residency A-103"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ward / zone
                    </label>
                    <input
                      type="text"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      placeholder="Ward 1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Address / landmark
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    placeholder="Street, building, nearby landmark…"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      placeholder="Demo City"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      placeholder="123456"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-slate-500">
                    Your addresses help create anonymized climate insights for
                    your ward. They aren&apos;t shared publicly.
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? "Saving…"
                      : typeof selectedId === "number"
                      ? "Save changes"
                      : "Save household"}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Right column: link + summary */}
          <div className="space-y-4">
            {/* Link existing household */}
            <form
              onSubmit={handleLink}
              className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5 space-y-3"
            >
              <h2 className="text-sm font-semibold text-emerald-900">
                Already have a household ID?
              </h2>
              <p className="text-xs text-slate-600">
                Some apartments or societies are pre-registered by the city. If
                your building has a{" "}
                <span className="font-medium text-emerald-800">
                  Household ID
                </span>{" "}
                shared on notice boards or bills, enter it here to link instead
                of creating a duplicate.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  placeholder="Enter household ID"
                />
                <button
                  type="submit"
                  disabled={linking}
                  className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 border border-emerald-100 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {linking ? "Linking…" : "Link"}
                </button>
              </div>
            </form>

            {/* Small summary card */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-emerald-900 mb-1">
                What happens next?
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-emerald-900">
                <li>• Your waste worker can log segregation for these locations.</li>
                <li>
                  • You&apos;ll soon see weekly segregation scores and PCC
                  earned.
                </li>
                <li>
                  • Your data contributes to anonymized climate stats for your
                  ward.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* All linked households list */}
        {households.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-white/90 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-emerald-900 mb-2">
              Your linked locations
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Click a location to edit it or set which one is your primary home.
            </p>
            <div className="space-y-2 text-sm">
              {households.map((h) => {
                const isSelected = typeof selectedId === "number" && selectedId === h.id;
                return (
                  <div
                    key={h.id}
                    className={[
                      "flex items-center justify-between rounded-xl border px-3 py-2 transition-colors cursor-pointer",
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-emerald-50 bg-emerald-50/40 hover:bg-emerald-50",
                    ].join(" ")}
                    onClick={() => handleSelectHousehold(h.id)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-emerald-900">{h.name}</p>
                        {h.is_primary && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {h.address || "No address"}{" "}
                        {h.ward && <>· {h.ward}</>}{" "}
                        {h.city && <>· {h.city}</>}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ID: {h.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!h.is_primary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakePrimary(h.id);
                          }}
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Make primary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
