import type { PublicStats } from "./types";

export const aboutFallbackStats: PublicStats = {
  total_users: 12840,
  total_waste_logs: 93420,
  total_verified_actions: 71206,
  total_carbon_saved: 182340.5,
  total_pcc_issued: 177990.2,
  avg_resolution_time_hours: 5.6,
  open_reports: 318,
};

export const aboutHero = {
  title: "Reimagining Urban Waste Intelligence.",
  subheadline:
    "Prakriti.AI unifies reporting, operations, verification, and carbon accountability into one civic workflow trusted by institutions.",
  microcopy: "Pilot-ready in weeks • Verified audit trail • Institution-grade operations",
};

export const mission = {
  heading: "Mission",
  statement:
    "Build a civic operating layer where every waste event is traceable, every decision is verifiable, and every climate outcome is measurable.",
  principles: [
    {
      title: "Transparency",
      text: "Every workflow stage is visible across stakeholders with timestamped status transitions.",
    },
    {
      title: "Accountability",
      text: "Evidence-linked verification ensures actions are auditable and reward logic is grounded in proof.",
    },
    {
      title: "Measurable Sustainability",
      text: "Impact is converted into carbon metrics and PCC values that can be reviewed, tracked, and reported.",
    },
  ],
};

export const problems = [
  {
    title: "Operational Blind Spots",
    text: "Field tasks, escalation paths, and SLA tracking are often disconnected across teams.",
  },
  {
    title: "No Verifiable Carbon Accounting",
    text: "Most systems cannot tie carbon claims to verified actions and evidence-backed records.",
  },
  {
    title: "Fragmented Stakeholders",
    text: "Citizens, workforce, bulk generators, and admins operate in silos with inconsistent data.",
  },
];

export const differentiators = [
  {
    title: "End-to-End Workflow",
    text: "Capture, assignment, verification, and closure are managed in one coordinated platform.",
  },
  {
    title: "Evidence-Linked Verification",
    text: "Weights, quality signals, and proof artifacts are bound to each verified action.",
  },
  {
    title: "Real-Time Ops + SLA Visibility",
    text: "Supervisors monitor bottlenecks, response performance, and open queue risk live.",
  },
  {
    title: "PCC Ledger",
    text: "Verified carbon savings are converted into transparent PCC entries with traceable attribution.",
  },
];

export const workflowSteps = [
  {
    title: "Capture",
    text: "Waste events are logged with location, photo, weight, and context metadata.",
  },
  {
    title: "Coordinate",
    text: "Teams route tasks by priority, geography, and field workload.",
  },
  {
    title: "Verify",
    text: "Authorized verification confirms quality and evidence before rewards are issued.",
  },
  {
    title: "Reward",
    text: "Carbon impact is translated into PCC through auditable ledger transactions.",
  },
];

export const approach = {
  heading: "Engineering accountability into waste systems",
  body:
    "Prakriti.AI combines AI-assisted waste classification, role-based workflows, verification audit logs, emission-factor-driven PCC calculations, and decision-grade dashboards. The architecture is designed for practical deployment in municipalities, campuses, societies, and enterprise facilities.",
  stack: [
    "AI waste classification",
    "Role-based workflow engine",
    "Evidence and audit logging",
    "Emission-factor-based PCC computation",
    "Operational + climate dashboards",
  ],
};

export const impactOutcomes = [
  {
    title: "Traceability",
    text: "Every verified action is linked to evidence, timestamps, and accountable actors.",
  },
  {
    title: "Measurable Carbon",
    text: "Impact metrics are calculated from verified weights and configurable emission factors.",
  },
  {
    title: "Operational Clarity",
    text: "Leaders get a single source of truth for SLAs, throughput, and quality trends.",
  },
];

export const ledgerPreview = [
  { id: "L-2301", category: "Plastic", verifiedWeight: "182 kg", carbonSaved: "455 kgCO2e", pcc: "448.4" },
  { id: "L-2302", category: "Paper", verifiedWeight: "134 kg", carbonSaved: "241.2 kgCO2e", pcc: "231.5" },
  { id: "L-2303", category: "Metal", verifiedWeight: "76 kg", carbonSaved: "304 kgCO2e", pcc: "300.2" },
  { id: "L-2304", category: "Organic", verifiedWeight: "268 kg", carbonSaved: "321.6 kgCO2e", pcc: "318.0" },
];

export const values = [
  {
    title: "Transparency",
    text: "Open process visibility across teams and decision-makers.",
  },
  {
    title: "Evidence-First",
    text: "Claims are accepted only when verification and supporting proof are complete.",
  },
  {
    title: "Pragmatic Deployment",
    text: "Designed to integrate into daily operations without disrupting frontline execution.",
  },
  {
    title: "Privacy & Governance",
    text: "Data handling and access control are structured for institutional compliance.",
  },
];

export const team = {
  heading: "Built by engineers and operators focused on civic outcomes",
  body:
    "Our team blends product engineering, operations systems, and climate accountability thinking. We build for real-world deployments where reliability, traceability, and measurable impact are non-negotiable.",
  bullets: [
    "Production-focused full-stack delivery",
    "Domain alignment with urban operations",
    "Auditability and governance by design",
  ],
};

export const aboutCta = {
  heading: "Bring Verified Waste Intelligence to Your Institution.",
  text: "Deploy a measurable workflow for waste operations, verification, and climate reporting.",
};
