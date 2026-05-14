-- GatePilot - Supabase go-live hardening

CREATE INDEX IF NOT EXISTS idx_users_estate_role ON users(estate_id, role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_residents_estate_status ON residents(estate_id, status, house_number);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON residents(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_residents_email ON residents(lower(email)) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_codes_estate_value ON codes(estate_id, code_value);
CREATE INDEX IF NOT EXISTS idx_codes_active_expiry ON codes(estate_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_vlogs_estate_gate_date ON validation_logs(estate_id, gate_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_vlogs_estate_outcome_date ON validation_logs(estate_id, outcome, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shifts_active_guard ON guard_shifts(guard_user_id, status, started_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_estates_updated_at ON estates;
CREATE TRIGGER set_estates_updated_at
BEFORE UPDATE ON estates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_residents_updated_at ON residents;
CREATE TRIGGER set_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_codes_updated_at ON codes;
CREATE TRIGGER set_codes_updated_at
BEFORE UPDATE ON codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_gates_updated_at ON gates;
CREATE TRIGGER set_gates_updated_at
BEFORE UPDATE ON gates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key text,
  p_expires_at timestamptz
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO rate_limits AS rl (key, count, expires_at)
  VALUES (p_key, 1, p_expires_at)
  ON CONFLICT (key) DO UPDATE
    SET count = rl.count + 1,
        expires_at = greatest(rl.expires_at, EXCLUDED.expires_at)
  RETURNING rl.count INTO new_count;

  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION consume_guest_code(
  p_code_id text,
  p_estate_id text,
  p_used_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE codes
  SET
    status = 'USED',
    used_at = p_used_at,
    expires_at = p_used_at,
    updated_at = p_used_at
  WHERE code_id = p_code_id
    AND estate_id = p_estate_id
    AND pass_type = 'GUEST'
    AND status = 'ACTIVE'
    AND expires_at > p_used_at;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;
