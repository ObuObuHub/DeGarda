-- Create reservations table for staff to reserve preferred shift dates
-- This is core to the workflow: Reservations → Generation → Approval

CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'LABORATOR',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'fulfilled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT reservations_unique_staff_date UNIQUE (staff_id, shift_date),
    CONSTRAINT reservations_future_date CHECK (shift_date >= CURRENT_DATE)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_staff_id ON reservations(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hospital_id ON reservations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shift_date ON reservations(shift_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_department ON reservations(department);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_hospital_date ON reservations(hospital_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_reservations_staff_status ON reservations(staff_id, status);

-- Insert some sample reservations for testing (optional)
-- These will be for next month to test the workflow
INSERT INTO reservations (staff_id, hospital_id, shift_date, department, status) VALUES
(
    (SELECT id FROM staff WHERE role = 'staff' AND hospital_id = 5 AND is_active = true LIMIT 1),
    5,
    DATE '2025-08-15',
    'LABORATOR',
    'active'
),
(
    (SELECT id FROM staff WHERE role = 'staff' AND hospital_id = 5 AND is_active = true OFFSET 1 LIMIT 1),
    5,
    DATE '2025-08-20',
    'LABORATOR', 
    'active'
),
(
    (SELECT id FROM staff WHERE role = 'staff' AND hospital_id = 6 AND is_active = true LIMIT 1),
    6,
    DATE '2025-08-25',
    'LABORATOR',
    'active'
) ON CONFLICT (staff_id, shift_date) DO NOTHING;