-- Simple Supabase Schema for Hospital Shift Management
-- Copy this into your Supabase SQL editor

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS swap_requests;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS users;

-- Users table (staff and managers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE,
    name VARCHAR NOT NULL,
    personal_code VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR CHECK (role IN ('STAFF', 'MANAGER')) NOT NULL DEFAULT 'STAFF',
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_date DATE NOT NULL,
    shift_time VARCHAR CHECK (shift_time IN ('morning', 'afternoon', 'night')) NOT NULL,
    department VARCHAR CHECK (department IN ('ATI', 'Urgente', 'Chirurgie', 'Medicina Interna')) NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR CHECK (status IN ('available', 'reserved', 'confirmed')) DEFAULT 'available',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate shifts
    UNIQUE(shift_date, shift_time, department)
);

-- Swap requests table
CREATE TABLE swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    to_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    status VARCHAR CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
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
INSERT INTO users (name, personal_code, role, department) VALUES
    -- Chirurgie
    ('Falub Andreea', 'FAL1', 'STAFF', 'Chirurgie'),
    ('Gunea Sebastian', 'GUN1', 'STAFF', 'Chirurgie'),
    ('Rusu Raul', 'RUS1', 'STAFF', 'Chirurgie'),
    ('Toron Mohannad', 'TOR1', 'STAFF', 'Chirurgie'),
    ('Mihalcea Sebastian', 'MIH1', 'STAFF', 'Chirurgie'),
    ('Butunoi Constantin', 'BUT1', 'STAFF', 'Chirurgie'),
    ('Dumitras Stefana', 'DUM1', 'STAFF', 'Chirurgie'),
    ('Druta Sandu', 'DRU1', 'STAFF', 'Chirurgie'),
    
    -- Medicina Interna
    ('Daraban Ana Maria', 'DAR1', 'STAFF', 'Medicina Interna'),
    ('Botezatu Olesea', 'BOT1', 'STAFF', 'Medicina Interna'),
    ('Budacu Sorin', 'BUD1', 'STAFF', 'Medicina Interna'),
    ('Preda Carla', 'PRE1', 'STAFF', 'Medicina Interna'),
    ('Gutu Simona', 'GUT1', 'STAFF', 'Medicina Interna'),
    ('Scintei Marius', 'SCI1', 'STAFF', 'Medicina Interna'),
    ('Pascariu Luminita', 'PAS1', 'STAFF', 'Medicina Interna'),
    ('Colbeanu Mihaela', 'COL1', 'STAFF', 'Medicina Interna'),
    ('Rezmires Anca', 'REZ1', 'STAFF', 'Medicina Interna'),
    
    -- Urgente
    ('Botezatu Cristina', 'BOC1', 'STAFF', 'Urgente'),
    ('Stoica Gabriel', 'STO1', 'STAFF', 'Urgente'),
    ('Lazaroiu Catalina', 'LAZ1', 'STAFF', 'Urgente'),
    ('Al-Aqil Abdulwali', 'ALA1', 'STAFF', 'Urgente'),
    ('Apostu Teodora', 'APO1', 'STAFF', 'Urgente'),
    ('Tilica Angela', 'TIL1', 'STAFF', 'Urgente'),
    
    -- ATI
    ('Botezatu Viorica', 'BOV1', 'STAFF', 'ATI'),
    ('Boaca Andreea', 'BOA1', 'STAFF', 'ATI'),
    ('Grecu Efim', 'GRE1', 'STAFF', 'ATI'),
    ('Smochina Natalia', 'SMO1', 'STAFF', 'ATI'),
    ('Calancia Cosmin', 'CAL1', 'STAFF', 'ATI'),
    ('Paval Alexandra', 'PAV1', 'STAFF', 'ATI'),
    ('Lupu Cosmina', 'LUP1', 'STAFF', 'ATI');

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