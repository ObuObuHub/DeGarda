-- Migration: Add staff for Piatra-Neamt hospital
-- Run this to populate the second hospital with sample staff

-- Insert staff for Spitalul Județean Piatra-Neamț
-- Using ON CONFLICT DO NOTHING to be idempotent
INSERT INTO users (name, personal_code, role, department, hospital_id, max_shifts_per_month)
SELECT
    name,
    personal_code,
    role::VARCHAR,
    department::VARCHAR,
    (SELECT id FROM hospitals WHERE code = 'PIATRA'),
    max_shifts
FROM (VALUES
    -- Chirurgie
    ('Popescu Ion', 'POP1', 'STAFF', 'Chirurgie', 8),
    ('Ionescu Maria', 'ION1', 'STAFF', 'Chirurgie', 8),
    ('Diaconu Alexandru', 'DIA1', 'STAFF', 'Chirurgie', 8),
    ('Marinescu Elena', 'MAR1', 'STAFF', 'Chirurgie', 7),
    ('Popa Cristian', 'POC1', 'STAFF', 'Chirurgie', 8),

    -- Medicina Interna
    ('Georgescu Ana', 'GEO1', 'STAFF', 'Medicina Interna', 8),
    ('Vasilescu Dan', 'VAS1', 'STAFF', 'Medicina Interna', 8),
    ('Mihai Andreea', 'MIA1', 'STAFF', 'Medicina Interna', 8),
    ('Tudor Constantin', 'TUD1', 'STAFF', 'Medicina Interna', 6),
    ('Radu Simona', 'RAD1', 'STAFF', 'Medicina Interna', 8),

    -- Urgente
    ('Dumitrescu Elena', 'DUE1', 'STAFF', 'Urgente', 8),
    ('Marin Andrei', 'MAN1', 'STAFF', 'Urgente', 8),
    ('Stanescu Laura', 'STL1', 'STAFF', 'Urgente', 8),
    ('Barbu Mihai', 'BAR1', 'STAFF', 'Urgente', 8),

    -- ATI
    ('Popa Alexandru', 'POA1', 'STAFF', 'ATI', 8),
    ('Stan Cristina', 'STC1', 'STAFF', 'ATI', 8),
    ('Neagu Victor', 'NEA1', 'STAFF', 'ATI', 8),
    ('Florea Diana', 'FLO1', 'STAFF', 'ATI', 8),
    ('Costache Marius', 'COS1', 'STAFF', 'ATI', 7),

    -- Hospital Admin for Piatra-Neamț
    ('Administrator Piatra-Neamț', 'ADM2', 'HOSPITAL_ADMIN', NULL, NULL)
) AS staff(name, personal_code, role, department, max_shifts)
ON CONFLICT (hospital_id, personal_code) DO NOTHING;

-- Also ensure departments exist for Piatra-Neamt
INSERT INTO departments (hospital_id, name, color, is_active)
SELECT
    (SELECT id FROM hospitals WHERE code = 'PIATRA'),
    name,
    color,
    true
FROM (VALUES
    ('ATI', '#DC2626'),
    ('Urgente', '#2563EB'),
    ('Chirurgie', '#16A34A'),
    ('Medicina Interna', '#9333EA')
) AS dept(name, color)
ON CONFLICT (hospital_id, name) DO NOTHING;

-- Ensure shift types exist for Piatra-Neamt
INSERT INTO shift_types (hospital_id, name, start_time, end_time, duration_hours, is_default, is_active)
SELECT
    (SELECT id FROM hospitals WHERE code = 'PIATRA'),
    name,
    start_time::TIME,
    end_time::TIME,
    duration_hours,
    is_default,
    true
FROM (VALUES
    ('24h', '08:00', '08:00', 24.00, true),
    ('Zi (12h)', '08:00', '20:00', 12.00, false),
    ('Noapte (12h)', '20:00', '08:00', 12.00, false)
) AS shifts(name, start_time, end_time, duration_hours, is_default)
ON CONFLICT (hospital_id, name) DO NOTHING;

-- Update department_id for users where it's null (link to departments table)
UPDATE users u
SET department_id = d.id
FROM departments d
WHERE u.department = d.name
  AND u.hospital_id = d.hospital_id
  AND u.department_id IS NULL
  AND u.department IS NOT NULL;
