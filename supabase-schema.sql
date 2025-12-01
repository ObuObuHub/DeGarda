-- Simple Supabase Schema for Hospital Shift Management
-- Copy this into your Supabase SQL editor

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS users;

-- Users table (staff, managers, and admin)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE,
    name VARCHAR NOT NULL,
    personal_code VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR CHECK (role IN ('STAFF', 'MANAGER', 'ADMIN')) NOT NULL DEFAULT 'STAFF',
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')),
    max_shifts_per_month INTEGER DEFAULT 8,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_date DATE NOT NULL,
    shift_time VARCHAR CHECK (shift_time IN ('24h')) NOT NULL DEFAULT '24h',
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')) NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR CHECK (status IN ('available', 'reserved', 'assigned', 'pending_swap')) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate shifts (only one 24h shift per department per day)
    UNIQUE(shift_date, department)
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

-- Unavailable dates table (when staff cannot work)
CREATE TABLE unavailable_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    reason VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate entries for same user and date
    UNIQUE(user_id, unavailable_date)
);

-- Insert real staff members
INSERT INTO users (name, personal_code, role, department, max_shifts_per_month) VALUES
    -- Chirurgie
    ('Falub Andreea', 'FAL1', 'STAFF', 'Chirurgie', 8),
    ('Gunea Sebastian', 'GUN1', 'STAFF', 'Chirurgie', 8),
    ('Rusu Raul', 'RUS1', 'STAFF', 'Chirurgie', 6),  -- Fewer shifts
    ('Toron Mohannad', 'TOR1', 'STAFF', 'Chirurgie', 8),
    ('Mihalcea Sebastian', 'MIH1', 'STAFF', 'Chirurgie', 8),
    ('Butunoi Constantin', 'BUT1', 'STAFF', 'Chirurgie', 8),
    ('Dumitras Stefana', 'DUM1', 'STAFF', 'Chirurgie', 5),  -- Part-time
    ('Druta Sandu', 'DRU1', 'STAFF', 'Chirurgie', 8),
    
    -- Medicina Interna
    ('Daraban Ana Maria', 'DAR1', 'STAFF', 'Medicina Interna', 8),
    ('Botezatu Olesea', 'BOT1', 'STAFF', 'Medicina Interna', 8),
    ('Budacu Sorin', 'BUD1', 'STAFF', 'Medicina Interna', 8),
    ('Preda Carla', 'PRE1', 'STAFF', 'Medicina Interna', 7),  -- Slightly fewer
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
    ('Apostu Teodora', 'APO1', 'STAFF', 'Urgente', 6),  -- Part-time
    ('Tilica Angela', 'TIL1', 'STAFF', 'Urgente', 8),
    
    -- ATI
    ('Botezatu Viorica', 'BOV1', 'STAFF', 'ATI', 8),
    ('Boaca Andreea', 'BOA1', 'STAFF', 'ATI', 8),
    ('Grecu Efim', 'GRE1', 'STAFF', 'ATI', 8),
    ('Smochina Natalia', 'SMO1', 'STAFF', 'ATI', 8),
    ('Calancia Cosmin', 'CAL1', 'STAFF', 'ATI', 8),
    ('Paval Alexandra', 'PAV1', 'STAFF', 'ATI', 8),
    ('Lupu Cosmina', 'LUP1', 'STAFF', 'ATI', 4),  -- Half-time,
    
    -- Admin
    ('Administrator', 'MAN2', 'ADMIN', NULL, NULL);  -- No shift limit for admin

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow all operations
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on swap_requests" ON swap_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on unavailable_dates" ON unavailable_dates FOR ALL USING (true) WITH CHECK (true);