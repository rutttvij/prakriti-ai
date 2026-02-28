import type { CaseStudy, FAQItem, Partner, PublicConfig, PublicStats, Testimonial } from "./types";

export const fallbackStats: PublicStats = {
  total_users: 210000,
  total_waste_logs: 52000,
  total_verified_actions: 38450,
  total_carbon_saved: 1240,
  total_pcc_issued: 980500,
  avg_resolution_time_hours: 5.7,
  open_reports: 128,
};

export const fallbackPartners: Partner[] = [
  { id: 1, name: "Green India Mission", logo_url: "", href: "#", order: 1, active: true },
  { id: 2, name: "Urban Civic Labs", logo_url: "", href: "#", order: 2, active: true },
  { id: 3, name: "Campus Earth Alliance", logo_url: "", href: "#", order: 3, active: true },
  { id: 4, name: "City Resilience Forum", logo_url: "", href: "#", order: 4, active: true },
];

export const fallbackTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "R. Menon",
    title: "Commissioner",
    org: "Metro City Council",
    quote: "Prakriti.AI gave us verifiable closure and ward-level transparency in weeks.",
    order: 1,
    active: true,
    avatar_url: null,
  },
  {
    id: 2,
    name: "A. Shah",
    title: "Sustainability Lead",
    org: "Western Tech Campus",
    quote: "Bulk workflows and PCC audit trail made compliance and reporting seamless.",
    order: 2,
    active: true,
    avatar_url: null,
  },
  {
    id: 3,
    name: "N. Iyer",
    title: "Ops Head",
    org: "Greenview Society Federation",
    quote: "Response time dropped and resident trust improved with evidence-backed updates.",
    order: 3,
    active: true,
    avatar_url: null,
  },
];

export const fallbackCaseStudies: CaseStudy[] = [
  {
    id: 1,
    title: "Ward Ops Modernization",
    org: "Navi District Municipal Cluster",
    metric_1: "31% faster resolution",
    metric_2: "18.4t CO2e avoided",
    summary: "Unified intake, verification, and worker routing improved SLA adherence in 90 days.",
    href: "#",
    order: 1,
    active: true,
  },
];

export const fallbackFaqs: FAQItem[] = [
  {
    id: 1,
    question: "How quickly can we launch a pilot?",
    answer: "Most pilots start in 2-4 weeks including setup, training, and workflow calibration.",
    order: 1,
    active: true,
  },
  {
    id: 2,
    question: "How is PCC calculated?",
    answer: "PCC is based on verified waste weight, category emission factor, and quality multiplier.",
    order: 2,
    active: true,
  },
  {
    id: 3,
    question: "Can we export audit trails?",
    answer: "Yes. Evidence-linked logs and ledger entries are exportable for audits and reviews.",
    order: 3,
    active: true,
  },
];

export const fallbackConfig: PublicConfig = {
  org_type_copy: {
    city: {
      headline: "Waste Ops That Cities Trust.",
      subheadline: "Coordinate wards, workers, and verification in one measurable civic stack.",
      bullets: ["Ward-level SLA visibility", "Verified closure trail", "Carbon & PCC dashboards"],
      snapshot_focus: "SLA and closure confidence",
      metric_labels: ["Open incidents", "Resolved today", "Verified actions", "PCC issued"],
    },
    campus: {
      headline: "Campus Waste Intelligence, End-to-End.",
      subheadline: "Track collection quality, compliance, and carbon impact across facilities.",
      bullets: ["Facility-level segregation quality", "Vendor verification control", "Audit-ready ESG exports"],
      snapshot_focus: "Compliance and quality",
      metric_labels: ["Open service tickets", "Hostel blocks covered", "Verified pickups", "PCC earned"],
    },
    society: {
      headline: "Society Operations With Verified Impact.",
      subheadline: "Improve resident service and segregation quality with audit-ready workflows.",
      bullets: ["Resident transparency", "Pickup accountability", "Waste-to-impact insights"],
      snapshot_focus: "Resident SLA and trust",
      metric_labels: ["Open reports", "Resolved requests", "Verified logs", "PCC credits"],
    },
    corporate: {
      headline: "Enterprise Waste Governance That Scales.",
      subheadline: "Standardize vendor performance, verification evidence, and carbon reporting.",
      bullets: ["Multi-site operational controls", "Evidence-backed compliance", "Carbon ledger confidence"],
      snapshot_focus: "Compliance and audit-readiness",
      metric_labels: ["Open cases", "Sites active", "Verified events", "PCC value"],
    },
  },
  seed_metrics: fallbackStats,
  cta: {
    primary: "Request Demo",
    secondary: "See Live Workflow",
  },
};

export const valueProps = [
  {
    title: "AI-first Intake",
    body: "Classify waste from photo and context instantly, then route to the right operational queue.",
    icon: "◈",
  },
  {
    title: "Verification Engine",
    body: "Only evidence-backed verification unlocks rewards, audit trails, and reporting confidence.",
    icon: "◎",
  },
  {
    title: "Carbon + PCC Ledger",
    body: "Translate verified actions into measurable climate value and transparent credit accounting.",
    icon: "✦",
  },
];
