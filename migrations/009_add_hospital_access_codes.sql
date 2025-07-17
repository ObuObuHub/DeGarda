-- Add hospital access codes for ultra-simple authentication
-- This replaces the complex staff password system with single access code per hospital

-- Add access_code column to hospitals table
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS access_code VARCHAR(10) UNIQUE;

-- Add access_code column to staff table for managers/admins
ALTER TABLE staff ADD COLUMN IF NOT EXISTS access_code VARCHAR(10) UNIQUE;

-- Update hospitals with simple 3-character access codes for staff
UPDATE hospitals SET access_code = 'LAB' WHERE id = 1; -- Piatra-Neamț
UPDATE hospitals SET access_code = 'BUH' WHERE id = 2; -- Buhuși

-- Update managers and admins with 6-character access codes
UPDATE staff SET access_code = 'MGR001' WHERE role = 'admin' AND id = (
  SELECT id FROM staff WHERE role = 'admin' LIMIT 1
);

-- Set manager access codes for each hospital
UPDATE staff SET access_code = 'MGR101' WHERE role = 'manager' AND hospital_id = 1; -- Piatra-Neamț manager
UPDATE staff SET access_code = 'MGR201' WHERE role = 'manager' AND hospital_id = 2; -- Buhuși manager

-- Create constraints
ALTER TABLE hospitals ADD CONSTRAINT hospitals_access_code_unique UNIQUE (access_code);
ALTER TABLE staff ADD CONSTRAINT staff_access_code_unique UNIQUE (access_code);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hospitals_access_code ON hospitals(access_code);
CREATE INDEX IF NOT EXISTS idx_staff_access_code ON staff(access_code);