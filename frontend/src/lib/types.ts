export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type PublicStats = {
  total_users: number;
  total_waste_logs: number;
  total_verified_actions: number;
  total_carbon_saved: number;
  total_pcc_issued: number;
  avg_resolution_time_hours: number;
  open_reports: number;
};

export type Partner = {
  id: number;
  name: string;
  logo_url: string;
  href?: string | null;
  order: number;
  active: boolean;
};

export type Testimonial = {
  id: number;
  name: string;
  title?: string | null;
  org?: string | null;
  quote: string;
  avatar_url?: string | null;
  order: number;
  active: boolean;
};

export type CaseStudy = {
  id: number;
  title: string;
  org: string;
  metric_1?: string | null;
  metric_2?: string | null;
  summary: string;
  href?: string | null;
  order: number;
  active: boolean;
};

export type FAQItem = {
  id: number;
  question: string;
  answer: string;
  order: number;
  active: boolean;
};

export type OrgTypeCopy = Record<
  string,
  {
    headline: string;
    subheadline: string;
    bullets?: string[];
    snapshot_focus?: string;
    metric_labels?: string[];
  }
>;

export type PublicConfig = {
  org_type_copy: OrgTypeCopy;
  seed_metrics: Partial<PublicStats>;
  cta: Record<string, string>;
};

export type LedgerRow = {
  timestamp: string;
  category: string;
  verified_weight: number;
  carbon_saved_kgco2e: number;
  pcc_awarded: number;
  quality_score: number;
};

export type LeadPayload = {
  name: string;
  org_name: string;
  org_type: "city" | "campus" | "society" | "corporate";
  email: string;
  phone?: string;
  message?: string;
};

export type ContactPayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

export type NewsletterPayload = {
  email: string;
};
