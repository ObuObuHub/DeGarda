import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Drop existing tables in the correct order to avoid foreign key constraints
    await sql`DROP TABLE IF EXISTS shift_swaps CASCADE`
    await sql`DROP TABLE IF EXISTS shift_reservations CASCADE`
    await sql`DROP TABLE IF EXISTS shifts CASCADE`
    await sql`DROP TABLE IF EXISTS staff_unavailability CASCADE`
    await sql`DROP TABLE IF EXISTS staff CASCADE`
    await sql`DROP TABLE IF EXISTS hospitals CASCADE`
    
    // Also drop legacy tables
    await sql`DROP TABLE IF EXISTS shift_swap_requests CASCADE`
    await sql`DROP TABLE IF EXISTS hospital_shift_config CASCADE`
    await sql`DROP TABLE IF EXISTS staff_shift_preferences CASCADE`
    await sql`DROP TABLE IF EXISTS templates CASCADE`
    await sql`DROP TABLE IF EXISTS shift_types CASCADE`
    await sql`DROP TABLE IF EXISTS users CASCADE`

    // Create new tables with the correct schema
    await sql`
      CREATE TABLE hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
        hospital_id INTEGER REFERENCES hospitals(id),
        specialization VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE shifts (
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
      CREATE TABLE shift_reservations (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, staff_id)
      )
    `

    await sql`
      CREATE TABLE shift_swaps (
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
      CREATE TABLE staff_unavailability (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, date)
      )
    `

    // Create indexes
    await sql`CREATE INDEX idx_shifts_date ON shifts(date)`
    await sql`CREATE INDEX idx_shifts_hospital ON shifts(hospital_id)`
    await sql`CREATE INDEX idx_shifts_staff ON shifts(staff_id)`
    await sql`CREATE INDEX idx_reservations_staff ON shift_reservations(staff_id)`
    await sql`CREATE INDEX idx_swaps_from_staff ON shift_swaps(from_staff_id)`
    await sql`CREATE INDEX idx_swaps_status ON shift_swaps(status)`

    // Insert sample hospitals
    const hospitals = await sql`
      INSERT INTO hospitals (name, city) VALUES 
        ('Spitalul Județean de Urgență', 'Piatra-Neamț'),
        ('Spitalul Municipal', 'Roman')
      RETURNING id
    `

    // Create admin user with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await sql`
      INSERT INTO staff (name, email, password, role, hospital_id, specialization) VALUES
        ('Administrator', 'admin@degarda.ro', ${hashedPassword}, 'admin', ${hospitals[0].id}, 'Administration')
    `

    return NextResponse.json({ 
      success: true, 
      message: 'Database reset and initialized successfully',
      admin: {
        email: 'admin@degarda.ro',
        password: 'admin123'
      }
    })
  } catch (error: any) {
    console.error('Database reset error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset database',
        details: error.message || error.toString()
      },
      { status: 500 }
    )
  }
}