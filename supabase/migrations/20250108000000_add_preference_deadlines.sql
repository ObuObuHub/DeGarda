-- Add preference deadlines table for department-level deadline management
-- Allows managers to set a 24-hour deadline for staff to submit preferences

CREATE TABLE preference_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  target_month DATE NOT NULL,  -- First day of the month this deadline applies to
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- activated_at + 24 hours
  activated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, target_month)
);

-- Index for fast lookups by department and month
CREATE INDEX idx_preference_deadlines_lookup
  ON preference_deadlines(department_id, target_month);

-- Index for checking active deadlines
CREATE INDEX idx_preference_deadlines_expires
  ON preference_deadlines(expires_at);

-- Enable RLS
ALTER TABLE preference_deadlines ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read deadlines (need to see if locked)
CREATE POLICY "Users can view deadlines"
  ON preference_deadlines
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow managers and admins to create/update deadlines
CREATE POLICY "Managers can manage deadlines"
  ON preference_deadlines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE preference_deadlines IS 'Stores 24-hour deadlines for preference submission per department per month';
COMMENT ON COLUMN preference_deadlines.target_month IS 'First day of the scheduling month (e.g., 2025-01-01 for January 2025)';
COMMENT ON COLUMN preference_deadlines.expires_at IS 'When the deadline expires (activated_at + 24 hours)';
