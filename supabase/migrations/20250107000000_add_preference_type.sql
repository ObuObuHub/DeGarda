-- Migration: Add preference_type to unavailable_dates table
-- This allows staff to mark dates as 'preferred' (want to work) or 'unavailable' (cannot work)

-- Add preference_type column with default 'unavailable' for backward compatibility
ALTER TABLE unavailable_dates
ADD COLUMN IF NOT EXISTS preference_type VARCHAR(20)
CHECK (preference_type IN ('unavailable', 'preferred'))
DEFAULT 'unavailable';

-- Update existing records to have explicit 'unavailable' type
UPDATE unavailable_dates
SET preference_type = 'unavailable'
WHERE preference_type IS NULL;

-- Create index for faster preference lookups
CREATE INDEX IF NOT EXISTS idx_unavailable_dates_preference
ON unavailable_dates(user_id, unavailable_date, preference_type);
