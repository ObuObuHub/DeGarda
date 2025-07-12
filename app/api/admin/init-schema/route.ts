import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Create tables if they don't exist
    
    // Hospitals table
    await sql`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Staff table
    await sql`
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
      )
    `

    // Shifts table
    await sql`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('day', 'night', '24h')),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        staff_id INTEGER REFERENCES staff(id),
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        department VARCHAR(100),
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'reserved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, type, hospital_id, department)
      )
    `

    // Shift reservations
    await sql`
      CREATE TABLE IF NOT EXISTS shift_reservations (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, staff_id)
      )
    `

    // Shift swap requests
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

    // Staff unavailability
    await sql`
      CREATE TABLE IF NOT EXISTS staff_unavailability (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, date)
      )
    `

    // Notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES staff(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_staff ON shift_reservations(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`

    // Fix email constraint to allow NULL
    try {
      await sql`ALTER TABLE staff ALTER COLUMN email DROP NOT NULL`
      console.log('Email constraint updated to allow NULL')
    } catch (e) {
      console.log('Email constraint already allows NULL or error updating:', e)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Database schema initialized successfully!'
    })
  } catch (error: any) {
    console.error('Init schema error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize schema',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}