import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { generateSecurePassword } from '@/lib/password-generator'

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

    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES staff(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reservations_staff ON shift_reservations(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`

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

    // Create admin and manager users with secure passwords
    const adminPasswordPlain = generateSecurePassword()
    const managerPasswordPlain = generateSecurePassword()
    
    // Log passwords securely (these should be saved/communicated securely)
    console.log('\n=== IMPORTANT: Save these passwords securely ===');
    console.log(`Admin password for admin@degarda.ro: ${adminPasswordPlain}`);
    console.log(`Manager password for manager@degarda.ro: ${managerPasswordPlain}`);
    console.log('================================================\n');
    
    const adminPassword = await bcrypt.hash(adminPasswordPlain, 10)
    const managerPassword = await bcrypt.hash(managerPasswordPlain, 10)
    
    await sql`
      INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
        ('Administrator Principal', 'admin@degarda.ro', ${adminPassword}, 'admin', 'medic', ${hospitalId}, 'Administration'),
        ('Manager Gărzi', 'manager@degarda.ro', ${managerPassword}, 'manager', 'medic', ${hospitalId}, 'Management')
      ON CONFLICT (email) DO NOTHING
    `

    // Insert all staff members from medical-shift-scheduler
    // Generate unique passwords for each staff member
    console.log('\n=== Staff Member Passwords ===');
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
      const staffPassword = generateSecurePassword()
      console.log(`${member.email}: ${staffPassword}`);
      const hashedPassword = await bcrypt.hash(staffPassword, 10)
      
      await sql`
        INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
          (${member.name}, ${member.email}, ${hashedPassword}, 'staff', ${member.type}, ${hospitalId}, 'Laborator')
        ON CONFLICT (email) DO NOTHING
      `
    }
    console.log('==============================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    })
  } catch (error) {
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