import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
        type VARCHAR(50) DEFAULT 'medic' CHECK (type IN ('medic', 'biolog', 'chimist', 'asistent')),
        hospital_id INTEGER REFERENCES hospitals(id),
        specialization VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
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
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS shift_reservations (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, staff_id)
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS shift_swaps (
        id SERIAL PRIMARY KEY,
        from_staff_id INTEGER NOT NULL REFERENCES staff(id),
        to_staff_id INTEGER REFERENCES staff(id),
        shift_id INTEGER NOT NULL REFERENCES shifts(id),
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        reviewed_by INTEGER REFERENCES staff(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS staff_unavailability (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, date)
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_staff ON shift_reservations(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status)`

    // Insert actual hospitals from medical-shift-scheduler
    const hospitals = await sql`
      INSERT INTO hospitals (name, city) VALUES 
        ('Spitalul Județean de Urgență Piatra-Neamț', 'Piatra-Neamț'),
        ('Spitalul "Prof. Dr. Eduard Apetrei" Buhuși', 'Buhuși')
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    // If no hospitals were inserted (they already exist), get the first hospital ID
    let hospitalId = 1
    if (hospitals.length === 0) {
      const existingHospitals = await sql`SELECT id FROM hospitals ORDER BY id LIMIT 1`
      if (existingHospitals.length > 0) {
        hospitalId = existingHospitals[0].id
      }
    } else {
      hospitalId = hospitals[0].id
    }

    // Create admin and manager users with hashed passwords
    const adminPassword = await bcrypt.hash('admin123', 10)
    const managerPassword = await bcrypt.hash('manager123', 10)
    
    await sql`
      INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
        ('Administrator Principal', 'admin@degarda.ro', ${adminPassword}, 'admin', 'medic', ${hospitalId}, 'Administration'),
        ('Manager Gărzi', 'manager@degarda.ro', ${managerPassword}, 'manager', 'medic', ${hospitalId}, 'Management')
      ON CONFLICT (email) DO NOTHING
    `

    // Insert all staff members from medical-shift-scheduler
    const defaultStaffPassword = await bcrypt.hash('staff123', 10)
    const staffMembers = [
      { name: 'Dr. Zugun Eduard', type: 'medic', email: 'zugun.eduard@degarda.ro' },
      { name: 'Dr. Gîlea Arina', type: 'medic', email: 'gilea.arina@degarda.ro' },
      { name: 'Dr. Manole Anca', type: 'medic', email: 'manole.anca@degarda.ro' },
      { name: 'Biol. Alforei Magda Elena', type: 'biolog', email: 'alforei.magda@degarda.ro' },
      { name: 'Dr. Rusica Iovu Elena', type: 'medic', email: 'rusica.elena@degarda.ro' },
      { name: 'Dr. Grădinariu Cristina', type: 'medic', email: 'gradinariu.cristina@degarda.ro' },
      { name: 'Dr. Ciorsac Alina', type: 'medic', email: 'ciorsac.alina@degarda.ro' },
      { name: 'Dr. Constantinescu Raluca', type: 'medic', email: 'constantinescu.raluca@degarda.ro' },
      { name: 'Dr. Dobrea Letiția', type: 'medic', email: 'dobrea.letitia@degarda.ro' },
      { name: 'Ch. Dobre Liliana Gabriela', type: 'chimist', email: 'dobre.liliana@degarda.ro' },
      { name: 'Dr. Chiper Leferman Andrei', type: 'medic', email: 'chiper.andrei@degarda.ro' }
    ]

    for (const member of staffMembers) {
      await sql`
        INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
          (${member.name}, ${member.email}, ${defaultStaffPassword}, 'staff', ${member.type}, ${hospitalId}, 'Laborator')
        ON CONFLICT (email) DO NOTHING
      `
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    })
  } catch (error: any) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error.message || error.toString()
      },
      { status: 500 }
    )
  }
}