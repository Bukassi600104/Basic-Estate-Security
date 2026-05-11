-- Estate Security - Full Schema Migration
-- Migrated from DynamoDB to Supabase Postgres

-- ============================================
-- Helper: nanoid generator
-- ============================================
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 12)
RETURNS text AS $$
DECLARE
  id text := '';
  i int := 0;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
BEGIN
  FOR i IN 1..size LOOP
    id := id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- Estates
-- ============================================
CREATE TABLE estates (
  estate_id TEXT PRIMARY KEY DEFAULT 'est_' || nanoid(12),
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED','TERMINATED')),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_tier TEXT NOT NULL DEFAULT 'BASIC'
    CHECK (subscription_tier IN ('BASIC','STANDARD','PREMIUM','ENTERPRISE')),
  subscription_status TEXT NOT NULL DEFAULT 'TRIALING'
    CHECK (subscription_status IN ('TRIALING','ACTIVE','PAST_DUE','EXPIRED')),
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'
    CHECK (billing_cycle IN ('MONTHLY','YEARLY')),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  subscription_started_at TIMESTAMPTZ,
  max_houses INT NOT NULL DEFAULT 20,
  max_admins INT NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================
-- Users (linked to Supabase Auth)
-- ============================================
CREATE TABLE users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  estate_id TEXT REFERENCES estates(estate_id),
  role TEXT NOT NULL CHECK (role IN (
    'SUPER_ADMIN','ESTATE_ADMIN','SUB_ADMIN','GUARD','RESIDENT','RESIDENT_DELEGATE'
  )),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resident_id TEXT,
  verification_code TEXT,
  password_changed BOOLEAN DEFAULT false,
  permissions TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_estate ON users(estate_id, created_at DESC);
CREATE INDEX idx_users_resident ON users(resident_id);

-- ============================================
-- Residents
-- ============================================
CREATE TABLE residents (
  resident_id TEXT PRIMARY KEY DEFAULT 'res_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  name TEXT NOT NULL,
  house_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (status IN ('PENDING','APPROVED','SUSPENDED')),
  phone TEXT,
  email TEXT,
  verification_code TEXT,
  credential_reset_requested BOOLEAN DEFAULT false,
  credential_reset_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_residents_estate ON residents(estate_id, house_number);

-- ============================================
-- Codes
-- ============================================
CREATE TABLE codes (
  code_id TEXT PRIMARY KEY DEFAULT 'code_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  code_value TEXT NOT NULL,
  resident_id TEXT NOT NULL REFERENCES residents(resident_id),
  pass_type TEXT NOT NULL CHECK (pass_type IN ('GUEST','STAFF')),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','USED','EXPIRED','REVOKED')),
  event_type TEXT CHECK (event_type IN ('ENTRY','EXIT')),
  visit_id TEXT,
  linked_code_id TEXT,
  guest_count INT NOT NULL DEFAULT 1,
  guest_names TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estate_id, code_value)
);
CREATE INDEX idx_codes_resident ON codes(estate_id, resident_id, created_at DESC);
CREATE INDEX idx_codes_visit ON codes(visit_id);

-- ============================================
-- Gates
-- ============================================
CREATE TABLE gates (
  gate_id TEXT PRIMARY KEY DEFAULT 'gate_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  name TEXT NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('DAY','NIGHT')),
  shift_start_hour INT,
  shift_end_hour INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gates_estate ON gates(estate_id);
CREATE UNIQUE INDEX idx_gates_estate_lower_name ON gates(estate_id, lower(name));

-- ============================================
-- Validation Logs
-- ============================================
CREATE TABLE validation_logs (
  log_id TEXT PRIMARY KEY DEFAULT 'vlog_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  gate_id TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('DAY','NIGHT')),
  shift_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE')),
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW','DENY')),
  failure_reason TEXT,
  pass_type TEXT,
  event_type TEXT CHECK (event_type IN ('ENTRY','EXIT')),
  visit_id TEXT,
  guest_count INT,
  resident_name TEXT,
  house_number TEXT,
  code_value TEXT NOT NULL,
  guard_user_id UUID NOT NULL,
  guard_name TEXT,
  guard_phone TEXT
);
CREATE INDEX idx_vlogs_estate_date ON validation_logs(estate_id, validated_at DESC);

-- ============================================
-- Activity Logs
-- ============================================
CREATE TABLE activity_logs (
  activity_id TEXT PRIMARY KEY DEFAULT 'act_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alogs_estate ON activity_logs(estate_id, created_at DESC);

-- ============================================
-- Guard Shifts
-- ============================================
CREATE TABLE guard_shifts (
  shift_id TEXT PRIMARY KEY DEFAULT 'shift_' || nanoid(12),
  estate_id TEXT NOT NULL REFERENCES estates(estate_id),
  guard_user_id UUID NOT NULL REFERENCES users(user_id),
  guard_name TEXT NOT NULL,
  gate_id TEXT NOT NULL REFERENCES gates(gate_id),
  gate_name TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('DAY','NIGHT')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED'))
);
CREATE INDEX idx_shifts_estate ON guard_shifts(estate_id, started_at DESC);
CREATE INDEX idx_shifts_guard ON guard_shifts(guard_user_id, started_at DESC);

-- ============================================
-- Rate Limits (with auto-expiry)
-- ============================================
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_rate_limits_expiry ON rate_limits(expires_at);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so our server-side API routes work without policies.
-- If we ever need client-side direct access, we'd add per-table policies here.
