import { type FormEvent, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import type { WasteReport } from "../../types/wasteReport";

interface WasteClassificationResult {
  id: string;
  type: string;
  description?: string;
  recyclable: boolean;
  recycle_steps?: string[];
  dispose_steps?: string[];
  confidence?: number;
}

export default function WasteReportPage() {
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [classification, setClassification] =
    useState<WasteClassificationResult | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<WasteReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Camera-specific state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Manual upload input
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  function resetImageState() {
    setImageFile(null);
    setClassification(null);
    setClassificationError(null);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
  }

  function handleRemoveImage() {
    resetImageState();
  }

  function handleRetakeImage() {
    // Option B: just clear current image & classification;
    // user can choose camera or upload again.
    resetImageState();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      resetImageState();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      resetImageState();
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreviewUrl(previewUrl);
    setClassification(null);
    setClassificationError(null);
    setError(null);
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => setError("Could not get your location. Please enter it manually."),
    );
  }

  // ---------- CAMERA HANDLING ----------

  async function startCamera() {
    try {
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setCameraError(
        "Unable to access camera. Please check browser permissions or use manual upload.",
      );
    }
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Start/stop camera when modal opens/closes
  useEffect(() => {
    if (showCameraModal) {
      void startCamera();
    } else {
      stopCamera();
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCameraModal]);

  async function handleCaptureFromCamera() {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
        }

        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(file);

        setImageFile(file);
        setImagePreviewUrl(previewUrl);
        setClassification(null);
        setClassificationError(null);
        setError(null);

        // Close camera modal after capture
        setShowCameraModal(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleUseCameraClick() {
    setShowCameraModal(true);
  }

  function handleUploadClick() {
    uploadInputRef.current?.click();
  }

  // ---------- AI CLASSIFICATION ----------

  async function handleClassify() {
    if (!imageFile) {
      setClassificationError("Please add a photo first.");
      return;
    }

    try {
      setClassifying(true);
      setClassificationError(null);

      const formData = new FormData();
      formData.append("image", imageFile);
      if (latitude) formData.append("latitude", latitude);
      if (longitude) formData.append("longitude", longitude);

      // Adjust endpoint to match your backend route
      const res = await api.post<WasteClassificationResult>(
        "/waste/classify",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setClassification(res.data);
    } catch (err) {
      console.error(err);
      setClassification(null);
      setClassificationError(
        "Failed to analyze the image. Please try again or submit without AI help.",
      );
    } finally {
      setClassifying(false);
    }
  }

  // ---------- SUBMIT REPORT ----------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!imageFile) {
      setError("Please attach a photo of the waste.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      if (description) formData.append("description", description);
      if (latitude) formData.append("latitude", latitude);
      if (longitude) formData.append("longitude", longitude);
      if (classification?.id)
        formData.append("classification_id", classification.id);
      formData.append("image", imageFile);

      const res = await api.post<WasteReport>("/waste/reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(res.data);
      setDescription("");
      setLatitude("");
      setLongitude("");
      resetImageState();
    } catch (err) {
      console.error(err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-800">
          Report Waste
        </h1>
        <p className="text-sm text-slate-600">
          See waste, take a photo, and send it. Your report helps workers and
          the city respond faster.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-5"
      >
        {/* Image capture / upload */}
        <div className="space-y-2">
          <label className="text-sm text-slate-700">Photo of waste *</label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUseCameraClick}
              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Use camera
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Upload from device
            </button>
          </div>

          {/* Hidden manual upload input */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-xs text-slate-500">
            Take a clear photo using your camera or upload an existing image.
          </p>

          {imagePreviewUrl && imageFile && (
            <div className="mt-2 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50"
              >
                <img
                  src={imagePreviewUrl}
                  alt="Selected waste"
                  className="h-16 w-16 object-cover"
                />
              </button>
              <div className="flex flex-col gap-1 text-xs text-slate-500">
                <div>
                  <p>Image attached. Click thumbnail to view full size.</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {imageFile.name}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Remove image
                  </button>
                  <button
                    type="button"
                    onClick={handleRetakeImage}
                    className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Retake image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI classification module */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-slate-800">
                AI waste classification
              </h2>
              <p className="text-xs text-slate-500">
                Let Prakriti.AI analyze the photo to identify waste type and
                recycling guidance.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClassify}
              disabled={!imageFile || classifying}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {classifying ? "Analyzing..." : "Analyze image"}
            </button>
          </div>

          {classificationError && (
            <p className="text-xs text-red-500">{classificationError}</p>
          )}

          {classification && (
            <div className="mt-2 space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700/80">
                    Detected type
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {classification.type}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    classification.recyclable
                      ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                      : "border-amber-400 bg-amber-50 text-amber-700"
                  }`}
                >
                  {classification.recyclable ? "Recyclable" : "Not recyclable"}
                </span>
              </div>

              {classification.description && (
                <p className="text-xs text-slate-700">
                  {classification.description}
                </p>
              )}

              {classification.recyclable &&
                classification.recycle_steps &&
                classification.recycle_steps.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-semibold text-emerald-800">
                      Suggested recycling steps
                    </p>
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs text-emerald-900">
                      {classification.recycle_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {!classification.recyclable &&
                classification.dispose_steps &&
                classification.dispose_steps.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs font-semibold text-amber-800">
                      Suggested disposal steps
                    </p>
                    <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
                      {classification.dispose_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Description</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
            placeholder="Eg. Mixed waste dumped near the community gate."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Location */}
        <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto] items-end">
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Latitude</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Optional"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-700">Longitude</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Optional"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={useBrowserLocation}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Use my location
          </button>
        </div>

        {/* Status messages */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-700">
            Report submitted successfully. ID:{" "}
            <span className="font-medium">
              {success.public_id ?? `#${success.id}`}
            </span>{" "}
            • Status: <span className="font-medium">{success.status}</span>
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>

      {/* Full image viewer */}
      {showImageModal && imagePreviewUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <button
            type="button"
            aria-label="Close full image"
            className="absolute inset-0"
            onClick={() => setShowImageModal(false)}
          />
          <div className="relative z-50 max-h-[90vh] max-w-3xl">
            <img
              src={imagePreviewUrl}
              alt="Waste preview full size"
              className="max-h-[90vh] w-auto rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Camera modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-full max-w-xl rounded-xl bg-slate-950/90 p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">
                Capture photo from camera
              </h2>
              <button
                type="button"
                onClick={() => setShowCameraModal(false)}
                className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-100 hover:bg-white/20"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-center rounded-lg bg-black/60 p-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="max-h-[60vh] w-full rounded-lg object-contain"
                />
              </div>

              {cameraError && (
                <p className="text-xs text-rose-200">{cameraError}</p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(false)}
                  className="rounded-lg border border-slate-500 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCaptureFromCamera}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                >
                  Capture photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
