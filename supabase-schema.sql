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

-- Sample data with simple personal codes
INSERT INTO users (name, personal_code, role, department) VALUES
    ('Dr. Ana Popescu', 'ANA1', 'MANAGER', 'ATI'),
    ('Asist. Maria Ionescu', 'MAR1', 'STAFF', 'ATI'),
    ('Asist. Ion Gheorghe', 'ION1', 'STAFF', 'Urgente'),
    ('Dr. Elena Radu', 'ELE1', 'STAFF', 'Chirurgie');

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