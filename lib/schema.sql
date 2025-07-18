-- DeGarda V2 - Simplified Schema
-- Focus on core features: shifts, reservations, and swaps

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  access_code VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table (doctors only)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  hospital_id INTEGER REFERENCES hospitals(id),
  specialization VARCHAR(100),
  access_code VARCHAR(10) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('day', 'night', '24h', '12h')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  staff_id INTEGER REFERENCES staff(id),
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  department VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'reserved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, type, hospital_id)
);

-- Shift reservations (staff reserve preferred dates)
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  department VARCHAR(50) NOT NULL DEFAULT 'LABORATOR',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reservations_unique_staff_date UNIQUE (staff_id, shift_date),
  CONSTRAINT reservations_future_date CHECK (shift_date >= CURRENT_DATE)
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

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES staff(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (for audit logging)
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES staff(id),
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_staff_id ON reservations(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hospital_id ON reservations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reservations_shift_date ON reservations(shift_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_department ON reservations(department);
CREATE INDEX IF NOT EXISTS idx_reservations_hospital_date ON reservations(hospital_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_reservations_staff_status ON reservations(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_hospital ON activities(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Insert sample data
INSERT INTO hospitals (name, city) VALUES 
  ('Spitalul Județean de Urgență', 'Piatra-Neamț'),
  ('Spitalul Municipal', 'Roman')
ON CONFLICT DO NOTHING;

-- Insert admin user (password: admin123)
INSERT INTO staff (name, email, password, role, hospital_id, specialization) VALUES
  ('Admin', 'admin@degarda.ro', '$2a$10$YourHashedPasswordHere', 'admin', 1, 'Administration')
ON CONFLICT (email) DO NOTHING;