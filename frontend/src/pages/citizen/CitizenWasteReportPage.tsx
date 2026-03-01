import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import CitizenPageHero from "../../components/citizen/CitizenPageHero";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { classifyWasteFile, createCitizenWasteReport, fetchCitizenHouseholds } from "../../lib/api";
import type { CitizenHousehold } from "../../lib/types";

export default function CitizenWasteReportPage() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [households, setHouseholds] = useState<CitizenHousehold[]>([]);
  const [householdId, setHouseholdId] = useState<number | "">("");
  const [description, setDescription] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [classificationLabel, setClassificationLabel] = useState("");
  const [classificationConfidence, setClassificationConfidence] = useState<number | "">("");
  const [filePathFromServer, setFilePathFromServer] = useState("");

  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");

  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const hh = await fetchCitizenHouseholds();
        setHouseholds(hh);
        const primary = hh.find((x) => x.is_primary) ?? hh[0];
        if (primary) setHouseholdId(primary.id);
      } catch {
        setHouseholds([]);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      push("error", "Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
      },
      () => push("error", "Could not read your location.")
    );
  };

  const resetAnalysis = () => {
    setClassificationLabel("");
    setClassificationConfidence("");
    setFilePathFromServer("");
  };

  const selectFile = (file: File | null) => {
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    resetAnalysis();
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    selectFile(file);
    e.target.value = "";
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      push("error", "Select an image file before analysis.");
      return;
    }

    setLoadingAnalyze(true);
    try {
      const out = await classifyWasteFile(selectedFile);
      const confidence = Number(out.confidence);
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        push("error", "Classification confidence must be between 0 and 1.");
        resetAnalysis();
        return;
      }

      setClassificationLabel(out.label ?? "");
      setClassificationConfidence(confidence);
      setFilePathFromServer(out.file_path ?? "");
      push("success", "Image analyzed successfully.");
    } catch (e: any) {
      push("error", e?.response?.data?.detail || "Failed to analyze image.");
      resetAnalysis();
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      push("error", "Description is required.");
      return;
    }

    if (!filePathFromServer || !classificationLabel || classificationConfidence === "") {
      push("error", "Analyze the selected image before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await createCitizenWasteReport({
        description: description.trim(),
        household_id: householdId === "" ? undefined : Number(householdId),
        classification_label: classificationLabel,
        classification_confidence: Number(classificationConfidence),
        file_path: filePathFromServer,
        latitude: latitude === "" ? undefined : Number(latitude),
        longitude: longitude === "" ? undefined : Number(longitude),
      });

      push("success", "Waste report submitted successfully.");
      navigate("/citizen/my-reports");
    } catch (e: any) {
      push("error", e?.response?.data?.detail || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <CitizenPageHero
        badge="CITIZEN · REPORT"
        title="Report Waste"
        subtitle="Upload a waste image file, run AI analysis, then submit a validated report."
      />

      <form onSubmit={submit} className="surface-card-strong mx-auto max-w-4xl space-y-4 rounded-3xl p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
          >
            <option value="">No household</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.is_primary ? " (Primary)" : ""}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={openCamera}>
              Use camera
            </Button>
            <Button type="button" variant="secondary" onClick={openFilePicker}>
              Upload from device
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={onFileChange}
          />
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/50 p-2">
            <button
              type="button"
              className="block w-full overflow-hidden rounded-xl"
              onClick={() => setPreviewOpen(true)}
            >
              <img src={previewUrl} alt="Selected preview" className="h-56 w-full rounded-xl object-cover md:h-72" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleAnalyze} disabled={!selectedFile || loadingAnalyze}>
            {loadingAnalyze ? "Analyzing..." : "Analyze Image"}
          </Button>
          {loadingAnalyze && (
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              Running classification
            </span>
          )}
        </div>

        <textarea
          rows={4}
          className="w-full rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
          placeholder="Describe the issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <input
            readOnly
            className="rounded-xl border border-white/40 bg-slate-100 px-3 py-2 text-sm"
            placeholder="Classification label"
            value={classificationLabel}
          />
          <input
            readOnly
            className="rounded-xl border border-white/40 bg-slate-100 px-3 py-2 text-sm"
            placeholder="Classification confidence"
            value={classificationConfidence === "" ? "" : Number(classificationConfidence).toFixed(4)}
          />
          <input
            type="number"
            step="0.000001"
            className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
            placeholder="Latitude (optional)"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <input
            type="number"
            step="0.000001"
            className="rounded-xl border border-white/40 bg-white/55 px-3 py-2 text-sm"
            placeholder="Longitude (optional)"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <Button type="button" variant="secondary" onClick={useMyLocation}>
          Use my location
        </Button>

        <Button type="submit" disabled={submitting || !filePathFromServer}>
          {submitting ? "Submitting..." : "Submit Report"}
        </Button>
      </form>

      {previewOpen && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </button>
            <img src={previewUrl} alt="Report full preview" className="max-h-[86vh] max-w-[90vw] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
