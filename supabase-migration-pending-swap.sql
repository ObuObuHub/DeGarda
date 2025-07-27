-- Migration script to add pending_swap status to existing shifts table
-- Run this in your Supabase SQL editor if you already have the shifts table created

-- Add the new status to the check constraint
ALTER TABLE shifts 
DROP CONSTRAINT IF EXISTS shifts_status_check;

ALTER TABLE shifts 
ADD CONSTRAINT shifts_status_check 
CHECK (status IN ('available', 'reserved', 'assigned', 'pending_swap'));

-- Optionally, update any shifts that were previously marked for swap through the swap_requests table
-- This is commented out by default as it may not be needed for all setups
/*
UPDATE shifts 
SET status = 'pending_swap' 
WHERE id IN (
    SELECT from_shift_id 
    FROM swap_requests 
    WHERE status = 'pending'
);
*/