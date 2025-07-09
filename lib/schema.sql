-- DeGarda V2 - Simplified Schema
-- Focus on core features: shifts, reservations, and swaps

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table (doctors only)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  hospital_id INTEGER REFERENCES hospitals(id),
  specialization VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('day', 'night', '24h')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  staff_id INTEGER REFERENCES staff(id),
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'reserved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, type, hospital_id)
);

-- Shift reservations
CREATE TABLE IF NOT EXISTS shift_reservations (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shift_id, staff_id)
);

-- Shift swap requests
CREATE TABLE IF NOT EXISTS shift_swaps (
  id SERIAL PRIMARY KEY,
  from_staff_id INTEGER NOT NULL REFERENCES staff(id),
  to_staff_id INTEGER REFERENCES staff(id), -- Can be NULL for open requests
  shift_id INTEGER NOT NULL REFERENCES shifts(id),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by INTEGER REFERENCES staff(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff unavailability (simple)
CREATE TABLE IF NOT EXISTS staff_unavailability (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_staff ON shift_reservations(staff_id);
CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status);

-- Insert sample data
INSERT INTO hospitals (name, city) VALUES 
  ('Spitalul Județean de Urgență', 'Piatra-Neamț'),
  ('Spitalul Municipal', 'Roman')
ON CONFLICT DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO staff (name, email, password, role, hospital_id, specialization) VALUES
  ('Admin', 'admin@degarda.ro', '$2a$10$YourHashedPasswordHere', 'admin', 1, 'Administration')
ON CONFLICT (email) DO NOTHING;