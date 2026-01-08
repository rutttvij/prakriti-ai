// src/pages/ContactPage.tsx
import { type FormEvent, useState } from "react";
import { submitContactMessage } from "../lib/api";

export const ContactPage: React.FC = () => {
  const [status, setStatus] = useState<"idle" | "submitted" | "error">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    try {
      await submitContactMessage({ name, email, message });
      setStatus("submitted");
      setMessage("");
      // optional: clear name/email too
      // setName("");
      // setEmail("");
    } catch (err) {
      console.error("Failed to submit contact message", err);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative">
      {/* Soft glow behind card */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_#bbf7d0,_transparent_65%)] opacity-70" />

      <section className="relative mx-auto max-w-4xl px-4 pt-16 pb-20">
        <div
          className="
            rounded-3xl
            border border-emerald-100/80
            bg-white/80
            px-6 py-7 sm:px-8 sm:py-9
            shadow-lg shadow-emerald-100/70
            backdrop-blur-md
          "
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Contact Us
          </h1>
          <p className="text-sm text-slate-700 mb-3">
            For partnerships, pilots, or support with your city or bulk
            generator, leave a message and we’ll get back to you.
          </p>
          <p className="text-xs text-slate-600 mb-6">
            You can also reach us directly at{" "}
            <a
              href="mailto:prakritiai.global@gmail.com"
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              prakritiai.global@gmail.com
            </a>
            .
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="
                    w-full rounded-xl
                    border border-emerald-100/80
                    bg-white/70
                    px-3 py-2.5 text-sm
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full rounded-xl
                    border border-emerald-100/80
                    bg-white/70
                    px-3 py-2.5 text-sm
                    shadow-sm shadow-emerald-50
                    focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                  "
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="
                  w-full rounded-2xl
                  border border-emerald-100/80
                  bg-white/70
                  px-3 py-2.5 text-sm
                  shadow-sm shadow-emerald-50
                  focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400
                "
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  inline-flex items-center justify-center
                  rounded-full bg-emerald-700
                  px-6 py-2.5 text-sm font-semibold text-white
                  shadow-sm shadow-emerald-400/60
                  hover:bg-emerald-800
                  transition
                  disabled:opacity-60 disabled:cursor-not-allowed
                "
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>

              {status === "submitted" && (
                <p className="text-xs text-emerald-700">
                  Thanks! Your message has been noted.
                </p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-500">
                  Something went wrong. Please try again in a bit.
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
