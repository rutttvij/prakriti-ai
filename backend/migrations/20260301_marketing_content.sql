BEGIN;

CREATE TABLE IF NOT EXISTS marketing_partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(600) NOT NULL,
  href VARCHAR(600) NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_testimonials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NULL,
  org VARCHAR(255) NULL,
  quote TEXT NOT NULL,
  avatar_url VARCHAR(600) NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_case_studies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  org VARCHAR(255) NOT NULL,
  metric_1 VARCHAR(255) NULL,
  metric_2 VARCHAR(255) NULL,
  summary TEXT NOT NULL,
  href VARCHAR(600) NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_faqs (
  id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(120) UNIQUE NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  org_name VARCHAR(255) NOT NULL,
  org_type VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  message TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'subscribed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS ix_marketing_partners_active_order ON marketing_partners(active, "order");
CREATE INDEX IF NOT EXISTS ix_marketing_testimonials_active_order ON marketing_testimonials(active, "order");
CREATE INDEX IF NOT EXISTS ix_marketing_case_studies_active_order ON marketing_case_studies(active, "order");
CREATE INDEX IF NOT EXISTS ix_marketing_faqs_active_order ON marketing_faqs(active, "order");
CREATE INDEX IF NOT EXISTS ix_leads_status_created_at ON leads(status, created_at DESC);

COMMIT;
