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

export type TrainingAudience = "citizen" | "bulk_generator";
export type TrainingDifficulty = "beginner" | "intermediate" | "advanced";
export type TrainingLessonType = "video" | "article" | "pdf" | "quiz" | "link";

export type TrainingLesson = {
  id: number;
  module_id: number;
  order_index: number;
  lesson_type: TrainingLessonType;
  title: string;
  content: string;
  created_at: string;
};

export type TrainingModuleAdmin = {
  id: number;
  audience: TrainingAudience;
  title: string;
  summary?: string | null;
  difficulty: TrainingDifficulty;
  est_minutes: number;
  cover_image_url?: string | null;
  is_published: boolean;
  lessons_count?: number;
  lessons?: TrainingLesson[];
  created_at: string;
  updated_at: string;
};

export type TrainingModuleListResponse = {
  items: TrainingModuleAdmin[];
  total: number;
  page: number;
  page_size: number;
};

export type TrainingModulePayload = {
  audience: TrainingAudience;
  title: string;
  summary?: string;
  difficulty: TrainingDifficulty;
  est_minutes: number;
  cover_image_url?: string;
  is_published: boolean;
};

export type DemoRequestStatus = "new" | "contacted" | "qualified" | "closed";
export type DemoRequestOrgType = "city" | "campus" | "society" | "corporate";

export type DemoRequest = {
  id: number;
  name: string;
  organization: string;
  org_type: DemoRequestOrgType;
  email: string;
  phone?: string | null;
  message?: string | null;
  status: DemoRequestStatus;
  admin_notes?: string | null;
  created_at: string;
};

export type DemoRequestListResponse = {
  items: DemoRequest[];
  total: number;
  page: number;
  page_size: number;
};

export type ContactMessageStatus = "new" | "in_progress" | "replied" | "closed" | "spam";

export type AdminContactMessageListItem = {
  id: number;
  name: string;
  email: string;
  subject?: string | null;
  message_preview: string;
  status: ContactMessageStatus;
  is_read: boolean;
  created_at: string;
};

export type AdminContactMessage = {
  id: number;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  status: ContactMessageStatus;
  is_read: boolean;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  converted_demo_request_id?: number | null;
};

export type AdminContactMessageListResponse = {
  items: AdminContactMessageListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminAnalyticsSummary = {
  kpis: {
    total_users: number;
    active_users: number;
    pending_approvals: number;
    total_zones: number;
    workforce_count: number;
    open_demo_requests: number;
    unread_contact_messages: number;
  };
  recent_activity: {
    kind: "demo_request" | "contact_message" | "audit_log";
    id: number;
    title: string;
    subtitle?: string | null;
    created_at: string;
  }[];
};

export type AdminApproval = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at?: string | null;
};

export type AdminZone = {
  id: number;
  name: string;
  type: string;
  city: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminWorkforceUser = {
  user_id: number;
  full_name?: string | null;
  email: string;
  role: string;
  is_active: boolean;
  zone_id?: number | null;
  zone_name?: string | null;
};

export type AdminPccSummary = {
  total_credited: number;
  total_debited: number;
  net_pcc: number;
  tx_count: number;
};

export type AdminPccTransaction = {
  id: number;
  user_id?: number | null;
  type: string;
  amount_pcc: number;
  reason?: string | null;
  created_at: string;
};

export type AdminAuditLog = {
  id: number;
  actor_user_id?: number | null;
  actor_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformSettings = {
  pcc_unit_kgco2e: number;
  emission_factors: Record<string, number>;
  quality_multipliers: Record<string, number>;
  feature_flags: {
    enable_training_modules: boolean;
    enable_pcc_calculator: boolean;
    [k: string]: boolean;
  };
};
