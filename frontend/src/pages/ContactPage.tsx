// src/pages/ContactPage.tsx
import { type FormEvent, useState } from "react";
import { submitContactMessage } from "../lib/api";
import { Navbar } from "../components/Navbar";

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
    <main className="public-shell landing-aurora">
      <Navbar />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(106,201,166,0.28),_transparent_65%)] opacity-90" />

      <section className="relative mx-auto max-w-4xl px-4 pb-20 pt-8">
        <div className="surface-card-strong px-6 py-7 sm:px-8 sm:py-9">
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
                  className="ui-input"
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
                  className="ui-input"
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
                className="ui-input min-h-28"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
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
