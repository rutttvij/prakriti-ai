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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [classificationLabel, setClassificationLabel] = useState("");
  const [classificationConfidence, setClassificationConfidence] = useState<number | "">("");
  const [filePathFromServer, setFilePathFromServer] = useState("");

  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");

  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;

    const startVideo = async () => {
      try {
        await video.play();
      } catch {
        setCameraError("Camera preview failed to start. Check browser camera permission.");
      }
    };

    if (video.readyState >= 1) {
      void startVideo();
    } else {
      video.onloadedmetadata = () => {
        void startVideo();
      };
    }

    return () => {
      video.onloadedmetadata = null;
    };
  }, [cameraOpen]);

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

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    resetAnalysis();
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

  const openPicker = () => {
    const input = pickerInputRef.current;
    if (!input) return;

    const maybeShowPicker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof maybeShowPicker === "function") {
      maybeShowPicker.call(input);
      return;
    }
    input.click();
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOpen(false);
    setCameraError(null);
  };

  const openCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      push("error", "Camera is not supported in this browser. Opening file picker.");
      openPicker();
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      push("error", "Could not access camera. Check permissions.");
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Failed to capture image.");
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
    });
    if (!blob) {
      setCameraError("Failed to capture image.");
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    selectFile(file);
    closeCamera();
  };

  const openFilePicker = () => openPicker();

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
            ref={pickerInputRef}
            type="file"
            className="sr-only"
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={openCamera}>
                Recapture
              </Button>
              <Button type="button" variant="secondary" onClick={clearSelectedImage}>
                Remove image
              </Button>
            </div>
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
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Classification Label</p>
            <p className="mt-1 text-lg font-semibold text-emerald-900">
              {classificationLabel || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Accuracy (Confidence)</p>
            <p className="mt-1 text-lg font-semibold text-emerald-900">
              {classificationConfidence === "" ? "—" : `${(Number(classificationConfidence) * 100).toFixed(2)}%`}
            </p>
          </div>
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

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4" onClick={closeCamera}>
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/20 bg-slate-900 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-100">Use camera</p>
              <button type="button" className="rounded-full bg-black/60 px-3 py-1 text-sm text-white" onClick={closeCamera}>
                Close
              </button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="h-[56vh] w-full rounded-xl bg-black object-cover" />
            {cameraError && <p className="mt-2 text-sm text-rose-300">{cameraError}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeCamera}>
                Cancel
              </Button>
              <Button type="button" onClick={captureFromCamera}>
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
