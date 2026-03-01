-- Prakriti.AI MVP inbox upgrade: contact_messages + demo_requests compatibility

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_message_status') THEN
        CREATE TYPE contact_message_status AS ENUM ('new', 'in_progress', 'replied', 'closed', 'spam');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demo_request_status') THEN
        CREATE TYPE demo_request_status AS ENUM ('new', 'contacted', 'qualified', 'closed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demo_request_org_type') THEN
        CREATE TYPE demo_request_org_type AS ENUM ('city', 'campus', 'society', 'corporate');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS demo_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    org_type demo_request_org_type NOT NULL DEFAULT 'city',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    message TEXT NULL,
    status demo_request_status NOT NULL DEFAULT 'new',
    admin_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages
    ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS converted_demo_request_id INTEGER NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Normalize values before enum conversion
UPDATE contact_messages
SET status = CASE
    WHEN status IN ('new', 'in_progress', 'replied', 'closed', 'spam') THEN status
    ELSE 'new'
END;

ALTER TABLE contact_messages
    ALTER COLUMN status TYPE contact_message_status
    USING status::contact_message_status,
    ALTER COLUMN status SET DEFAULT 'new';

-- Convert existing demo_requests columns to enums if needed
ALTER TABLE demo_requests
    ALTER COLUMN org_type TYPE demo_request_org_type
    USING CASE
        WHEN org_type IN ('city', 'campus', 'society', 'corporate') THEN org_type::demo_request_org_type
        ELSE 'city'::demo_request_org_type
    END,
    ALTER COLUMN org_type SET DEFAULT 'city'::demo_request_org_type;

ALTER TABLE demo_requests
    ALTER COLUMN status TYPE demo_request_status
    USING CASE
        WHEN status IN ('new', 'contacted', 'qualified', 'closed') THEN status::demo_request_status
        ELSE 'new'::demo_request_status
    END,
    ALTER COLUMN status SET DEFAULT 'new'::demo_request_status;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_contact_messages_converted_demo_request_id'
    ) THEN
        ALTER TABLE contact_messages
            ADD CONSTRAINT fk_contact_messages_converted_demo_request_id
            FOREIGN KEY (converted_demo_request_id)
            REFERENCES demo_requests(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS ix_contact_messages_is_read ON contact_messages (is_read);
CREATE INDEX IF NOT EXISTS ix_contact_messages_created_at ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_contact_messages_converted_demo_request_id ON contact_messages (converted_demo_request_id);

CREATE INDEX IF NOT EXISTS ix_demo_requests_status ON demo_requests (status);
CREATE INDEX IF NOT EXISTS ix_demo_requests_org_type ON demo_requests (org_type);
CREATE INDEX IF NOT EXISTS ix_demo_requests_created_at ON demo_requests (created_at DESC);

COMMIT;
