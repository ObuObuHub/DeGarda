-- Migration: Add dynamic departments table
-- This replaces hardcoded department enum with a dynamic table

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, name)
);

-- 2. Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on departments" ON departments FOR ALL USING (true) WITH CHECK (true);

-- 3. Insert default departments for each hospital
INSERT INTO departments (hospital_id, name, color)
SELECT h.id, d.name, d.color
FROM hospitals h
CROSS JOIN (VALUES
    ('ATI', '#DC2626'),
    ('Urgente', '#2563EB'),
    ('Chirurgie', '#16A34A'),
    ('Medicina Interna', '#9333EA')
) AS d(name, color)
ON CONFLICT (hospital_id, name) DO NOTHING;

-- 4. Add department_id column to users (nullable first for migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- 5. Migrate existing user departments to department_id
UPDATE users u
SET department_id = d.id
FROM departments d
WHERE u.department = d.name
  AND u.hospital_id = d.hospital_id
  AND u.department_id IS NULL;

-- 6. Add department_id column to shifts (nullable first for migration)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE CASCADE;

-- 7. Migrate existing shift departments to department_id
UPDATE shifts s
SET department_id = d.id
FROM departments d
WHERE s.department = d.name
  AND s.hospital_id = d.hospital_id
  AND s.department_id IS NULL;

-- 8. Drop old constraints (if they exist)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_department_check;

-- 9. Drop old unique constraint and create new one
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_unique_per_hospital_type;
ALTER TABLE shifts ADD CONSTRAINT shifts_unique_per_hospital_dept_type
    UNIQUE(hospital_id, shift_date, department_id, shift_type_id);

-- 10. Drop old department columns (after migration is verified)
-- Keeping for now to allow gradual transition
-- ALTER TABLE users DROP COLUMN department;
-- ALTER TABLE shifts DROP COLUMN department;
