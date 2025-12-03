import { FormEvent, useState } from "react";
import api from "../lib/api";
import type { WasteReport } from "../types/wasteReport";

export default function WasteReportPage() {
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<WasteReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
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
      setImageFile(null);
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
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
      >
        <div className="space-y-1">
          <label className="text-sm text-slate-700">Photo of waste *</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
          />
          <p className="text-xs text-slate-500">
            Upload a clear photo of the waste location.
          </p>
        </div>

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


        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}
