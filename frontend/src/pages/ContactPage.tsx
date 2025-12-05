import { type FormEvent, useState } from "react";

export const ContactPage: React.FC = () => {
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // placeholder; later send to backend or email service
    setStatus("submitted");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-3">Contact Us</h1>
      <p className="text-sm text-slate-600 mb-4">
        For partnerships, pilots, or support with your city or bulk generator,
        leave a message and we’ll get back to you.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-emerald-100 rounded-2xl p-5 space-y-4 shadow-sm"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name
          </label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Message
          </label>
          <textarea
            required
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
        >
          Send message
        </button>

        {status === "submitted" && (
          <p className="text-xs text-emerald-600 mt-2">
            Thanks! Your message has been noted.
          </p>
        )}
      </form>
    </main>
  );
};
