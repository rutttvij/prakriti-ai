import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Navbar } from "../components/landing/Navbar";
import { Footer } from "../components/landing/Footer";
import { Dialog } from "../components/ui/Dialog";
import { Separator } from "../components/ui/Separator";
import { useToast } from "../components/ui/Toast";

import { AboutHero } from "../components/about/AboutHero";
import { Mission } from "../components/about/Mission";
import { ProblemCards } from "../components/about/ProblemCards";
import { Differentiators } from "../components/about/Differentiators";
import { MiniWorkflow } from "../components/about/MiniWorkflow";
import { ApproachTech } from "../components/about/ApproachTech";
import { ImpactVision } from "../components/about/ImpactVision";
import { Values } from "../components/about/Values";
import { Team } from "../components/about/Team";
import { AboutCTA } from "../components/about/AboutCTA";

import { aboutFallbackStats } from "../lib/aboutCopy";
import type { LeadPayload, PublicStats } from "../lib/types";
import { fetchPublicStats, submitLead } from "../lib/api";

export default function AboutPage() {
  const { push } = useToast();
  const [stats, setStats] = useState<PublicStats>(aboutFallbackStats);
  const [demoOpen, setDemoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<LeadPayload>({
    name: "",
    org_name: "",
    org_type: "city",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await fetchPublicStats();
        if (mounted && data) setStats(data);
      } catch {
        if (mounted) setStats(aboutFallbackStats);
      }
    };

    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewImpact = () => {
    const el = document.getElementById("about-impact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitLead(lead);
      push("success", "Demo request submitted successfully.");
      setDemoOpen(false);
      setLead({
        name: "",
        org_name: "",
        org_type: "city",
        email: "",
        phone: "",
        message: "",
      });
    } catch {
      push("error", "Unable to submit request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="landing-aurora min-h-screen">
      <motion.div
        className="fixed left-0 right-0 top-0 z-[70] h-1 bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6 }}
        style={{ transformOrigin: "left" }}
      />

      <Navbar onRequestDemo={() => setDemoOpen(true)} />

      <AboutHero
        stats={stats}
        onRequestDemo={() => setDemoOpen(true)}
        onViewImpact={handleViewImpact}
      />

      <Mission />
      <ProblemCards />
      <Differentiators />
      <MiniWorkflow />
      <ApproachTech />
      <ImpactVision />
      <Values />
      <Team />

      <div className="mx-auto max-w-7xl px-4 pb-10">
        <Separator />
      </div>

      <AboutCTA onRequestDemo={() => setDemoOpen(true)} />
      <Footer />

      <Dialog open={demoOpen} onClose={() => setDemoOpen(false)} title="Request Demo">
        <form onSubmit={handleLeadSubmit} className="space-y-3">
          <input
            className="ui-input"
            placeholder="Name"
            value={lead.name}
            onChange={(e) => setLead((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="ui-input"
            placeholder="Organization"
            value={lead.org_name}
            onChange={(e) => setLead((prev) => ({ ...prev, org_name: e.target.value }))}
            required
          />
          <select
            className="ui-input"
            value={lead.org_type}
            onChange={(e) =>
              setLead((prev) => ({
                ...prev,
                org_type: e.target.value as LeadPayload["org_type"],
              }))
            }
          >
            <option value="city">City</option>
            <option value="campus">Campus</option>
            <option value="society">Society</option>
            <option value="corporate">Corporate</option>
          </select>
          <input
            className="ui-input"
            type="email"
            placeholder="Email"
            value={lead.email}
            onChange={(e) => setLead((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            className="ui-input"
            placeholder="Phone (optional)"
            value={lead.phone || ""}
            onChange={(e) => setLead((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <textarea
            className="ui-input min-h-24"
            placeholder="Message"
            value={lead.message || ""}
            onChange={(e) => setLead((prev) => ({ ...prev, message: e.target.value }))}
          />
          <button className="btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </Dialog>
    </main>
  );
}
