ALTER TABLE codes
ADD COLUMN IF NOT EXISTS generated_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generated_by_name TEXT,
ADD COLUMN IF NOT EXISTS generated_by_role TEXT CHECK (
  generated_by_role IS NULL OR generated_by_role IN ('RESIDENT','RESIDENT_DELEGATE')
);

CREATE INDEX IF NOT EXISTS idx_codes_generated_by
ON codes(estate_id, generated_by_user_id, created_at DESC);

ALTER TABLE validation_logs
ADD COLUMN IF NOT EXISTS generated_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generated_by_name TEXT,
ADD COLUMN IF NOT EXISTS generated_by_role TEXT CHECK (
  generated_by_role IS NULL OR generated_by_role IN ('RESIDENT','RESIDENT_DELEGATE')
);
