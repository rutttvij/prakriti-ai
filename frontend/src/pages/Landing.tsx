import { useEffect, useMemo, useState } from "react";
import { motion, useScroll } from "framer-motion";

import {
  fetchPublicCaseStudies,
  fetchPublicConfig,
  fetchPublicFAQs,
  fetchPublicPartners,
  fetchPublicStats,
  fetchPublicTestimonials,
  fetchSampleLedger,
  submitLead,
} from "../lib/api";
import {
  fallbackCaseStudies,
  fallbackConfig,
  fallbackFaqs,
  fallbackPartners,
  fallbackStats,
  fallbackTestimonials,
} from "../lib/defaults";
import type { CaseStudy, FAQItem, LeadPayload, LedgerRow, OrgTypeCopy, Partner, PublicStats, Testimonial } from "../lib/types";
import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { PartnersStrip } from "../components/landing/PartnersStrip";
import { ValueProps } from "../components/landing/ValueProps";
import { HowItWorksStepper } from "../components/landing/HowItWorksStepper";
import { RolesGrid } from "../components/landing/RolesGrid";
import { ImpactPccSection } from "../components/landing/ImpactPccSection";
import { SecuritySection } from "../components/landing/SecuritySection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { CaseStudySection } from "../components/landing/CaseStudySection";
import { FaqSection } from "../components/landing/FaqSection";
import { FinalCtaForm } from "../components/landing/FinalCtaForm";
import { Footer } from "../components/landing/Footer";
import { MobileCtaBar } from "../components/landing/MobileCtaBar";
import { BackToTop } from "../components/landing/BackToTop";
import { Dialog } from "../components/ui/Dialog";
import { useToast } from "../components/ui/Toast";

const roleKeys = ["city", "campus", "society", "corporate"] as const;
type RoleKey = (typeof roleKeys)[number];

export default function Landing() {
  const { push } = useToast();
  const { scrollYProgress } = useScroll();

  const [stats, setStats] = useState<PublicStats>(fallbackStats);
  const [partners, setPartners] = useState<Partner[]>(fallbackPartners);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>(fallbackCaseStudies);
  const [faqs, setFaqs] = useState<FAQItem[]>(fallbackFaqs);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [config, setConfig] = useState<OrgTypeCopy>(fallbackConfig.org_type_copy);
  const [trendValues, setTrendValues] = useState<number[]>([]);

  const [role, setRole] = useState<RoleKey>("city");
  const [requestDemoOpen, setRequestDemoOpen] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadPayload>({
    name: "",
    org_name: "",
    org_type: "city",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    const load = async () => {
      const [s, p, t, c, f, l, cfg] = await Promise.allSettled([
        fetchPublicStats(),
        fetchPublicPartners(),
        fetchPublicTestimonials(),
        fetchPublicCaseStudies(),
        fetchPublicFAQs(),
        fetchSampleLedger(),
        fetchPublicConfig(),
      ]);

      let hasFailure = false;

      if (s.status === "fulfilled" && s.value) setStats(s.value);
      else hasFailure = true;

      if (p.status === "fulfilled" && p.value?.length) setPartners(p.value);
      else hasFailure = true;

      if (t.status === "fulfilled" && t.value?.length) setTestimonials(t.value);
      else hasFailure = true;

      if (c.status === "fulfilled" && c.value?.length) setCaseStudies(c.value);
      else hasFailure = true;

      if (f.status === "fulfilled" && f.value?.length) setFaqs(f.value);
      else hasFailure = true;

      if (l.status === "fulfilled" && Array.isArray(l.value)) {
        setLedgerRows(l.value);
        if (l.value.length > 0) {
          const derived = l.value
            .map((row) =>
              Number.isFinite(row.quality_score)
                ? Math.round(row.quality_score * 100)
                : Math.round(row.carbon_saved_kgco2e)
            )
            .slice(0, 14)
            .reverse();
          setTrendValues(derived);
        }
      } else {
        hasFailure = true;
      }

      if (cfg.status === "fulfilled" && Object.keys(cfg.value?.org_type_copy || {}).length) {
        setConfig(cfg.value.org_type_copy);
      } else {
        hasFailure = true;
      }

      if (hasFailure) {
        push("error", "Some live sections are unavailable. Showing fallback data where needed.");
      }
    };
    void load();
  }, [push]);

  const roleCopy = useMemo(() => {
    return config[role] || fallbackConfig.org_type_copy[role];
  }, [role, config]);

  const onWorkflow = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLead(true);
    try {
      await submitLead(leadForm);
      push("success", "Demo request submitted successfully.");
      setRequestDemoOpen(false);
      setLeadForm({ name: "", org_name: "", org_type: role, email: "", phone: "", message: "" });
    } catch {
      push("error", "Unable to submit request right now.");
    } finally {
      setLoadingLead(false);
    }
  };

  return (
    <div className="landing-aurora min-h-screen">
      <motion.div className="fixed left-0 right-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-500" style={{ scaleX: scrollYProgress }} />

      <Navbar onRequestDemo={() => setRequestDemoOpen(true)} />

      <Hero
        role={role}
        onRoleChange={(v) => {
          setRole(v);
          setLeadForm((prev) => ({ ...prev, org_type: v }));
        }}
        rolesConfig={config}
        roleCopy={roleCopy}
        stats={stats}
        trendValues={trendValues}
        onRequestDemo={() => setRequestDemoOpen(true)}
        onSeeWorkflow={onWorkflow}
      />

      <PartnersStrip partners={partners} />
      <ValueProps />
      <HowItWorksStepper />
      <RolesGrid />
      <ImpactPccSection rows={ledgerRows} />
      <SecuritySection />
      <TestimonialsSection testimonials={testimonials} />
      <CaseStudySection studies={caseStudies} />
      <FaqSection faqs={faqs} />
      <FinalCtaForm />
      <Footer />

      <MobileCtaBar onRequestDemo={() => setRequestDemoOpen(true)} />
      <BackToTop />

      <Dialog open={requestDemoOpen} onClose={() => setRequestDemoOpen(false)} title="Request Demo">
        <form onSubmit={onLeadSubmit} className="space-y-3">
          <input className="ui-input" placeholder="Name" value={leadForm.name} onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="ui-input" placeholder="Organization" value={leadForm.org_name} onChange={(e) => setLeadForm((p) => ({ ...p, org_name: e.target.value }))} required />
          <select className="ui-input" value={leadForm.org_type} onChange={(e) => setLeadForm((p) => ({ ...p, org_type: e.target.value as RoleKey }))}>
            {roleKeys.map((rk) => <option key={rk} value={rk}>{rk}</option>)}
          </select>
          <input className="ui-input" type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="ui-input" placeholder="Phone (optional)" value={leadForm.phone || ""} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} />
          <textarea className="ui-input min-h-24" placeholder="Message" value={leadForm.message || ""} onChange={(e) => setLeadForm((p) => ({ ...p, message: e.target.value }))} />
          <button className="btn-primary w-full" disabled={loadingLead} type="submit">{loadingLead ? "Submitting..." : "Submit"}</button>
        </form>
      </Dialog>
    </div>
  );
}
