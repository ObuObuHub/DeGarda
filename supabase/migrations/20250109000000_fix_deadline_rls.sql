-- Fix overly permissive RLS policies on preference_deadlines table
-- Previously allowed ANY authenticated user to modify deadlines

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Managers can manage deadlines" ON preference_deadlines;

-- Create restrictive policy for INSERT (managers and admins only)
CREATE POLICY "Only managers can create deadlines"
  ON preference_deadlines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER')
    )
  );

-- Create restrictive policy for UPDATE (managers and admins only)
CREATE POLICY "Only managers can update deadlines"
  ON preference_deadlines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER')
    )
  );

-- Create restrictive policy for DELETE (admins only - more restrictive)
CREATE POLICY "Only admins can delete deadlines"
  ON preference_deadlines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN')
    )
  );
