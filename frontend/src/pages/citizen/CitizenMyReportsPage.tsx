import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { WasteReport, WasteReportStatus } from "../../types/wasteReport";
import { BACKEND_ORIGIN } from "../../lib/config";

interface WasteClassificationSummary {
  id: string;
  type: string;
  description?: string;
  recyclable: boolean;
  recycle_steps?: string[];
  dispose_steps?: string[];
  confidence?: number;
}

interface WasteReportWithClassification extends WasteReport {
  classification?: WasteClassificationSummary | null;
  classification_id?: string | null;
}

function statusStyles(status: WasteReportStatus) {
  switch (status) {
    case "OPEN":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function classificationPillStyles(recyclable: boolean | undefined) {
  if (recyclable === undefined) return "";
  return recyclable
    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
    : "border-amber-400 bg-amber-50 text-amber-700";
}

function formatIST(input: string | Date | null | undefined) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

// Same metadata as backend (shortened descriptions for UI)
const CLASS_METADATA: Record<
  string,
  {
    type: string;
    description: string;
    recyclable: boolean;
    recycle_steps?: string[];
    dispose_steps?: string[];
  }
> = {
  aerosol_cans: {
    type: "Aerosol cans",
    description:
      "Pressurized metal spray cans used for deodorant, paint, or cleaners.",
    recyclable: true,
    recycle_steps: [
      "Ensure the can is completely empty.",
      "Do not pierce or crush the can.",
      "Remove plastic caps if accepted separately.",
      "Place in the metal recycling / dry waste bin.",
    ],
  },
  aluminum_food_cans: {
    type: "Aluminum food cans",
    description:
      "Aluminum cans used for packaged food items such as beans or soups.",
    recyclable: true,
    recycle_steps: [
      "Empty and lightly rinse the can.",
      "Flatten gently if safe to do so.",
      "Place in the metal recycling bin.",
    ],
  },
  aluminum_soda_cans: {
    type: "Aluminum beverage cans",
    description: "Soft drink or soda cans made of aluminum.",
    recyclable: true,
    recycle_steps: [
      "Empty any remaining liquid.",
      "Rinse if sticky.",
      "Crush to save space and place in metal recycling.",
    ],
  },
  cardboard_boxes: {
    type: "Cardboard boxes",
    description: "Corrugated cardboard boxes used for shipping and packaging.",
    recyclable: true,
    recycle_steps: [
      "Remove plastic tape or Styrofoam.",
      "Flatten the box completely.",
      "Keep dry and place in cardboard recycling.",
    ],
  },
  cardboard_packaging: {
    type: "Cardboard packaging",
    description: "Thin cardboard packaging such as cereal or shoe boxes.",
    recyclable: true,
    recycle_steps: [
      "Remove plastic liners or films.",
      "Flatten boxes.",
      "Place in paper/cardboard recycling.",
    ],
  },
  clothing: {
    type: "Clothing",
    description: "Garments and fabric-based textile items.",
    recyclable: false,
    dispose_steps: [
      "Donate or reuse if in good condition.",
      "Use textile recycling if available.",
      "Otherwise dispose as dry non-recyclable waste.",
    ],
  },
  coffee_grounds: {
    type: "Coffee grounds",
    description: "Used coffee grounds from brewing machines or filters.",
    recyclable: false,
    dispose_steps: [
      "Combine with other organic kitchen waste.",
      "Place in wet waste / compost bin.",
    ],
  },
  disposable_plastic_cutlery: {
    type: "Disposable plastic cutlery",
    description: "Single-use plastic spoons, forks, and knives.",
    recyclable: false,
    dispose_steps: [
      "Avoid single-use plastic cutlery where possible.",
      "Dispose in dry non-recyclable waste.",
    ],
  },
  eggshells: {
    type: "Eggshells",
    description: "Shells left after using eggs in cooking.",
    recyclable: false,
    dispose_steps: [
      "Combine with other organic kitchen waste.",
      "Place in wet waste / compost bin.",
    ],
  },
  food_waste: {
    type: "Food waste",
    description: "Leftover cooked food, peels, and other organic scraps.",
    recyclable: false,
    dispose_steps: [
      "Keep separate from plastic, metal, and glass.",
      "Place in wet waste / compost bin.",
    ],
  },
  glass_beverage_bottles: {
    type: "Glass beverage bottles",
    description: "Glass bottles used for water, soft drinks, or juice.",
    recyclable: true,
    recycle_steps: [
      "Empty and rinse.",
      "Remove lids and caps.",
      "Place in glass recycling bin.",
    ],
  },
  glass_cosmetic_containers: {
    type: "Glass cosmetic containers",
    description: "Small glass jars or bottles used for cosmetics or skincare.",
    recyclable: true,
    recycle_steps: [
      "Empty and rinse.",
      "Remove pumps or plastic lids if possible.",
      "Place in glass recycling bin.",
    ],
  },
  glass_food_jars: {
    type: "Glass food jars",
    description: "Glass jars used for sauces, jams, pickles, and spreads.",
    recyclable: true,
    recycle_steps: [
      "Empty and rinse.",
      "Remove metal lids and recycle separately if accepted.",
      "Place in glass recycling bin.",
    ],
  },
  magazines: {
    type: "Magazines",
    description: "Glossy printed magazines and catalogues.",
    recyclable: true,
    recycle_steps: [
      "Remove plastic wrapping.",
      "Keep dry and bundle with other paper for recycling.",
    ],
  },
  newspaper: {
    type: "Newspaper",
    description: "Old newspapers and newsprint material.",
    recyclable: true,
    recycle_steps: [
      "Keep dry and free from food stains.",
      "Bundle or tie for easy handling.",
      "Place in paper recycling.",
    ],
  },
  office_paper: {
    type: "Office paper",
    description: "Printer paper, notebooks without plastic, and envelopes.",
    recyclable: true,
    recycle_steps: [
      "Remove plastic covers and metal clips if possible.",
      "Keep dry and clean.",
      "Place in paper recycling.",
    ],
  },
  paper_cups: {
    type: "Paper cups",
    description:
      "Disposable paper cups, often lined with a thin plastic coating.",
    recyclable: false,
    dispose_steps: [
      "Empty completely.",
      "Dispose with dry non-recyclable waste unless special collection exists.",
    ],
  },
  plastic_cup_lids: {
    type: "Plastic cup lids",
    description: "Plastic lids used on takeaway beverage cups.",
    recyclable: true,
    recycle_steps: [
      "Remove from the cup and clean if needed.",
      "Place with other recyclable plastics where accepted.",
    ],
  },
  plastic_detergent_bottles: {
    type: "Plastic detergent bottles",
    description: "Thick plastic bottles used for detergents and cleaners.",
    recyclable: true,
    recycle_steps: [
      "Empty and rinse.",
      "Replace cap or remove pump as per local rules.",
      "Place in plastic recycling.",
    ],
  },
  plastic_food_containers: {
    type: "Plastic food containers",
    description:
      "Rigid plastic boxes or trays used for food storage or takeaway.",
    recyclable: true,
    recycle_steps: [
      "Remove food residue and rinse.",
      "Place in plastic recycling bin.",
    ],
  },
  plastic_shopping_bags: {
    type: "Plastic shopping bags",
    description: "Thin plastic carry bags from stores and markets.",
    recyclable: false,
    dispose_steps: [
      "Reuse bags where possible.",
      "Avoid mixing with wet organic waste.",
      "Dispose in dry non-recyclable waste or bag collection points.",
    ],
  },
  plastic_soda_bottles: {
    type: "Plastic soda bottles (PET)",
    description: "Clear plastic beverage bottles made from PET plastic.",
    recyclable: true,
    recycle_steps: [
      "Empty and rinse.",
      "Remove cap and label if required.",
      "Crush and place in plastic recyclables.",
    ],
  },
  plastic_straws: {
    type: "Plastic straws",
    description: "Single-use plastic drinking straws.",
    recyclable: false,
    dispose_steps: [
      "Avoid single-use plastic straws.",
      "Dispose in dry non-recyclable waste.",
    ],
  },
  plastic_trash_bags: {
    type: "Plastic trash bags",
    description: "Garbage bags made of thin plastic film.",
    recyclable: false,
    dispose_steps: [
      "Tie securely before disposal.",
      "Place in designated waste collection for landfill/incineration.",
    ],
  },
  plastic_water_bottles: {
    type: "Plastic water bottles (PET)",
    description: "Packaged drinking water bottles similar to soda bottles.",
    recyclable: true,
    recycle_steps: [
      "Empty completely and rinse.",
      "Remove caps if required locally.",
      "Crush bottles and place in plastic recyclables.",
    ],
  },
  shoes: {
    type: "Shoes and footwear",
    description: "Casual or sports shoes, often made from mixed materials.",
    recyclable: false,
    dispose_steps: [
      "Donate if still usable.",
      "Use footwear recycling if available.",
      "Otherwise dispose as dry non-recyclable waste.",
    ],
  },
  steel_food_cans: {
    type: "Steel food cans",
    description: "Tinned food containers made from steel.",
    recyclable: true,
    recycle_steps: ["Empty and rinse.", "Place in metal recycling bin."],
  },
  styrofoam_cups: {
    type: "Styrofoam cups",
    description: "Disposable cups made from expanded polystyrene.",
    recyclable: false,
    dispose_steps: [
      "Avoid using Styrofoam where possible.",
      "Dispose in dry non-recyclable waste.",
    ],
  },
  styrofoam_food_containers: {
    type: "Styrofoam food containers",
    description: "Takeaway food boxes made from Styrofoam.",
    recyclable: false,
    dispose_steps: ["Remove food residue.", "Dispose in dry non-recyclable waste."],
  },
  tea_bags: {
    type: "Tea bags",
    description: "Used tea bags from brewing tea.",
    recyclable: false,
    dispose_steps: [
      "Let tea bags cool and drain excess liquid.",
      "Place in wet waste / compost bin.",
    ],
  },
};

function buildClassificationFromReport(r: any): WasteClassificationSummary | null {
  const label: string | undefined = r.classification_label || r.classification_id;
  if (!label) return null;

  const meta = CLASS_METADATA[label];
  if (!meta) {
    return {
      id: label,
      type: label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: "AI detected this waste type based on the uploaded photo.",
      recyclable: !!r.classification_recyclable,
      confidence:
        typeof r.classification_confidence === "number"
          ? r.classification_confidence
          : undefined,
    };
  }

  return {
    id: label,
    type: meta.type,
    description: meta.description,
    recyclable:
      typeof r.classification_recyclable === "boolean"
        ? r.classification_recyclable
        : meta.recyclable,
    recycle_steps: meta.recycle_steps,
    dispose_steps: meta.dispose_steps,
    confidence:
      typeof r.classification_confidence === "number"
        ? r.classification_confidence
        : undefined,
  };
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<WasteReportWithClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageAlt, setPreviewImageAlt] = useState<string>("");

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.get<WasteReport[]>("/waste/reports/me");

        const withClassification: WasteReportWithClassification[] = res.data.map(
          (r: any) => ({
            ...r,
            classification: buildClassificationFromReport(r),
          }),
        );

        setReports(withClassification);
      } catch (err) {
        console.error(err);
        setError("Failed to load your reports.");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  function buildImageUrl(imagePath: string) {
    if (imagePath.startsWith("http")) return imagePath;
    return `${BACKEND_ORIGIN}/${imagePath.replace(/^\/+/, "")}`;
  }

  function openImagePreview(imagePath: string, alt: string) {
    setPreviewImageUrl(buildImageUrl(imagePath));
    setPreviewImageAlt(alt);
  }

  if (loading) {
    return <div className="text-slate-600">Loading your waste reports...</div>;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          My Waste Reports
        </h1>
        <p className="text-sm text-slate-600">
          Track the status of waste issues you&apos;ve reported across the city.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {reports.length === 0 && !error && (
        <p className="text-sm text-slate-500">
          You haven&apos;t reported any waste yet. Use the{" "}
          <span className="font-medium">Report Waste</span> page to submit your
          first report.
        </p>
      )}

      <div className="space-y-3">
        {reports.map((r) => {
          const created = formatIST(r.created_at);
          const resolved = r.resolved_at ? formatIST(r.resolved_at) : null;
          const cls = r.classification ?? null;

          return (
            <div
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-stretch md:justify-between gap-3"
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {r.public_id ? `Report ${r.public_id}` : `Report #${r.id}`}
                  </h2>
                  <span
                    className={
                      "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium " +
                      statusStyles(r.status)
                    }
                  >
                    {r.status.replace("_", " ")}
                  </span>

                  {cls && (
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium " +
                        classificationPillStyles(cls.recyclable)
                      }
                    >
                      {cls.recyclable ? "Recyclable" : "Not recyclable"}
                    </span>
                  )}
                </div>

                {r.description && (
                  <p className="text-sm text-slate-600">{r.description}</p>
                )}

                <p className="text-xs text-slate-500">
                  Created: {created}
                  {resolved && (
                    <>
                      {" • "}Resolved: {resolved}
                    </>
                  )}
                </p>

                {r.latitude && r.longitude && (
                  <p className="text-xs text-slate-500">
                    Location: {r.latitude}, {r.longitude}
                  </p>
                )}

                {cls && (
                  <div className="mt-1 space-y-1 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-emerald-700/80">
                          Classification
                        </p>
                        <p className="text-sm font-semibold text-emerald-900">
                          {cls.type}
                        </p>
                      </div>
                      {typeof cls.confidence === "number" && (
                        <p className="text-[11px] text-emerald-800">
                          Confidence:{" "}
                          <span className="font-semibold">
                            {(cls.confidence * 100).toFixed(0)}%
                          </span>
                        </p>
                      )}
                    </div>

                    {cls.description && (
                      <p className="text-xs text-slate-700 mt-1">
                        {cls.description}
                      </p>
                    )}

                    {cls.recyclable &&
                      cls.recycle_steps &&
                      cls.recycle_steps.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-semibold text-emerald-800">
                            Suggested recycling steps
                          </p>
                          <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs text-emerald-900">
                            {cls.recycle_steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {!cls.recyclable &&
                      cls.dispose_steps &&
                      cls.dispose_steps.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-semibold text-amber-800">
                            Suggested disposal steps
                          </p>
                          <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
                            {cls.dispose_steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {r.image_path && (
                <div className="w-full md:w-40 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      openImagePreview(r.image_path!, `Waste report ${r.id} image`)
                    }
                    className="group block w-full"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={buildImageUrl(r.image_path)}
                        alt={`Waste report ${r.id}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white transition group-hover:bg-black/30">
                        <span className="rounded-full bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100">
                          View image
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {previewImageUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute inset-0"
            onClick={() => {
              setPreviewImageUrl(null);
              setPreviewImageAlt("");
            }}
          />
          <div className="relative z-50 max-h-[90vh] max-w-3xl">
            <img
              src={previewImageUrl}
              alt={previewImageAlt || "Waste report image"}
              className="max-h-[90vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => {
                setPreviewImageUrl(null);
                setPreviewImageAlt("");
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
