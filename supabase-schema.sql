-- DeGarda Schema - Multi-Hospital Support with Configurable Shift Types
-- Copy this into your Supabase SQL editor

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS unavailable_dates;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS shift_types;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS hospitals;

-- Hospitals table
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shift types table (configurable per hospital)
CREATE TABLE shift_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, name)
);

-- Users table (staff, managers, and admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE,
    name VARCHAR NOT NULL,
    personal_code VARCHAR(20) NOT NULL,
    role VARCHAR CHECK (role IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER', 'STAFF')) NOT NULL DEFAULT 'STAFF',
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    max_shifts_per_month INTEGER DEFAULT 8,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Personal code must be unique within a hospital (or globally for SUPER_ADMIN)
    UNIQUE(hospital_id, personal_code)
);

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_date DATE NOT NULL,
    shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE RESTRICT,
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')) NOT NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR CHECK (status IN ('available', 'reserved', 'assigned', 'pending_swap')) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW(),

    -- Allow multiple shift types per day, but only one of each type per department
    UNIQUE(hospital_id, shift_date, department, shift_type_id)
);

-- Swap requests table
CREATE TABLE swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    status VARCHAR CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unavailable dates table (when staff cannot work OR prefer to work)
CREATE TABLE unavailable_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    reason VARCHAR,
    preference_type VARCHAR(20) CHECK (preference_type IN ('unavailable', 'preferred')) DEFAULT 'unavailable',
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate entries for same user and date
    UNIQUE(user_id, unavailable_date)
);

-- Insert initial hospitals
INSERT INTO hospitals (name, code, location) VALUES
    ('Spitalul „Prof. dr. Eduard Apetrei" Buhuși', 'BUHUSI', 'Buhuși'),
    ('Spitalul Județean de Urgență Piatra-Neamț', 'PIATRA', 'Piatra-Neamț');

-- Insert default shift types for each hospital (24h shifts: 08:00 to 08:00 next day)
INSERT INTO shift_types (hospital_id, name, start_time, end_time, duration_hours, is_default)
SELECT id, '24h', '08:00', '08:00', 24, true FROM hospitals;

-- Insert additional common shift types for Buhuși
INSERT INTO shift_types (hospital_id, name, start_time, end_time, duration_hours, is_default)
SELECT id, 'Zi (12h)', '08:00', '20:00', 12, false FROM hospitals WHERE code = 'BUHUSI';

INSERT INTO shift_types (hospital_id, name, start_time, end_time, duration_hours, is_default)
SELECT id, 'Noapte (12h)', '20:00', '08:00', 12, false FROM hospitals WHERE code = 'BUHUSI';

-- Insert Super Admin (no hospital - global access)
INSERT INTO users (name, personal_code, role, department, hospital_id, max_shifts_per_month) VALUES
    ('Super Admin', 'SUPER', 'SUPER_ADMIN', NULL, NULL, NULL);

-- Insert staff for Spitalul Buhuși
INSERT INTO users (name, personal_code, role, department, hospital_id, max_shifts_per_month)
SELECT
    name,
    personal_code,
    role,
    department,
    (SELECT id FROM hospitals WHERE code = 'BUHUSI'),
    max_shifts
FROM (VALUES
    -- Chirurgie
    ('Falub Andreea', 'FAL1', 'STAFF', 'Chirurgie', 8),
    ('Gunea Sebastian', 'GUN1', 'STAFF', 'Chirurgie', 8),
    ('Rusu Raul', 'RUS1', 'STAFF', 'Chirurgie', 6),
    ('Toron Mohannad', 'TOR1', 'STAFF', 'Chirurgie', 8),
    ('Mihalcea Sebastian', 'MIH1', 'STAFF', 'Chirurgie', 8),
    ('Butunoi Constantin', 'BUT1', 'STAFF', 'Chirurgie', 8),
    ('Dumitras Stefana', 'DUM1', 'STAFF', 'Chirurgie', 5),
    ('Druta Sandu', 'DRU1', 'STAFF', 'Chirurgie', 8),

    -- Medicina Interna
    ('Daraban Ana Maria', 'DAR1', 'STAFF', 'Medicina Interna', 8),
    ('Botezatu Olesea', 'BOT1', 'STAFF', 'Medicina Interna', 8),
    ('Budacu Sorin', 'BUD1', 'STAFF', 'Medicina Interna', 8),
    ('Preda Carla', 'PRE1', 'STAFF', 'Medicina Interna', 7),
    ('Gutu Simona', 'GUT1', 'STAFF', 'Medicina Interna', 8),
    ('Scintei Marius', 'SCI1', 'STAFF', 'Medicina Interna', 8),
    ('Pascariu Luminita', 'PAS1', 'STAFF', 'Medicina Interna', 8),
    ('Colbeanu Mihaela', 'COL1', 'STAFF', 'Medicina Interna', 8),
    ('Rezmires Anca', 'REZ1', 'STAFF', 'Medicina Interna', 8),

    -- Urgente
    ('Botezatu Cristina', 'BOC1', 'STAFF', 'Urgente', 8),
    ('Stoica Gabriel', 'STO1', 'STAFF', 'Urgente', 8),
    ('Lazaroiu Catalina', 'LAZ1', 'STAFF', 'Urgente', 8),
    ('Al-Aqil Abdulwali', 'ALA1', 'STAFF', 'Urgente', 8),
    ('Apostu Teodora', 'APO1', 'STAFF', 'Urgente', 6),
    ('Tilica Angela', 'TIL1', 'STAFF', 'Urgente', 8),

    -- ATI
    ('Botezatu Viorica', 'BOV1', 'STAFF', 'ATI', 8),
    ('Boaca Andreea', 'BOA1', 'STAFF', 'ATI', 8),
    ('Grecu Efim', 'GRE1', 'STAFF', 'ATI', 8),
    ('Smochina Natalia', 'SMO1', 'STAFF', 'ATI', 8),
    ('Calancia Cosmin', 'CAL1', 'STAFF', 'ATI', 8),
    ('Paval Alexandra', 'PAV1', 'STAFF', 'ATI', 8),
    ('Lupu Cosmina', 'LUP1', 'STAFF', 'ATI', 4),

    -- Hospital Admin for Buhuși
    ('Administrator Buhuși', 'ADM1', 'HOSPITAL_ADMIN', NULL, NULL)
) AS staff(name, personal_code, role, department, max_shifts);

-- Insert staff for Spitalul Județean Piatra-Neamț
INSERT INTO users (name, personal_code, role, department, hospital_id, max_shifts_per_month)
SELECT
    name,
    personal_code,
    role,
    department,
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
) AS staff(name, personal_code, role, department, max_shifts);

-- Enable Row Level Security
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow all operations (app handles authorization)
CREATE POLICY "Allow all operations on hospitals" ON hospitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on shift_types" ON shift_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on swap_requests" ON swap_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on unavailable_dates" ON unavailable_dates FOR ALL USING (true) WITH CHECK (true);
