-- GatePilot identity and pilot-trial support.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_email TEXT;

UPDATE users
SET auth_email = email
WHERE auth_email IS NULL
  AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_email
  ON users(lower(auth_email))
  WHERE auth_email IS NOT NULL;

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS trial_type TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (trial_type IN ('STANDARD','PILOT'));

CREATE INDEX IF NOT EXISTS idx_estates_trial_type
  ON estates(trial_type, subscription_status);

CREATE TABLE IF NOT EXISTS admin_estate_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estate_id TEXT NOT NULL REFERENCES estates(estate_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ESTATE_ADMIN','SUB_ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, estate_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_estate_access_estate
  ON admin_estate_access(estate_id, user_id);

INSERT INTO admin_estate_access (user_id, estate_id, role)
SELECT user_id, estate_id, role
FROM users
WHERE estate_id IS NOT NULL
  AND role IN ('ESTATE_ADMIN','SUB_ADMIN')
ON CONFLICT (user_id, estate_id) DO NOTHING;
