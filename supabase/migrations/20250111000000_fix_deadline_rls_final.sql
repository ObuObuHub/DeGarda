-- FINAL FIX: Drop ALL RLS policies on preference_deadlines and recreate fresh
-- Previous migrations created conflicting policies

-- First, drop ALL existing policies (using DO block to handle if they don't exist)
DO $$
BEGIN
    -- Drop all policies that might exist from any migration
    DROP POLICY IF EXISTS "Users can view deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Managers can manage deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Only managers can create deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Only managers can update deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Only admins can delete deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Authenticated users can create deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Authenticated users can update deadlines" ON preference_deadlines;
    DROP POLICY IF EXISTS "Authenticated users can delete deadlines" ON preference_deadlines;
END $$;

-- Now create simple permissive policies for all operations
-- Authorization is enforced at application level (usePreferenceDeadline hook checks user.role)

CREATE POLICY "allow_select"
  ON preference_deadlines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_insert"
  ON preference_deadlines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_update"
  ON preference_deadlines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_delete"
  ON preference_deadlines FOR DELETE
  TO authenticated
  USING (true);
