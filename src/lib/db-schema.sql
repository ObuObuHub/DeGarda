-- Create swap_requests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user can't create duplicate requests
  UNIQUE(requester_shift_id, target_shift_id)
);

-- Add indexes for performance
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_target ON swap_requests(target_user_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);

-- Add RLS policies
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Users can see swap requests they're involved in
CREATE POLICY "Users can view their swap requests" ON swap_requests
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  );

-- Users can create swap requests for their own shifts
CREATE POLICY "Users can create swap requests" ON swap_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
  );

-- Users can update their own swap requests (cancel) or respond to requests targeting them
CREATE POLICY "Users can update relevant swap requests" ON swap_requests
  FOR UPDATE USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id
  );

-- Managers and admins can see all swap requests
CREATE POLICY "Managers can view all swap requests" ON swap_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('MANAGER', 'ADMIN')
    )
  );