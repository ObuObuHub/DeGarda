/**
 * Migration to create staff_passwords table for individual staff authentication
 * This replaces generic access codes with staff-specific passwords
 */

import { sql } from './db'
import { logger } from './logger'
import bcrypt from 'bcryptjs'

export async function createStaffPasswordsTable() {
  try {
    logger.info('Migration', 'Creating staff_passwords table')
    
    // Create the staff_passwords table
    await sql`
      CREATE TABLE IF NOT EXISTS staff_passwords (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        password_plain VARCHAR(10) NOT NULL, -- For manager viewing (encrypted in practice)
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id),
        UNIQUE(password_plain, hospital_id) -- Ensure unique passwords per hospital
      )
    `
    
    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_staff ON staff_passwords(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_hospital ON staff_passwords(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_active ON staff_passwords(is_active)`
    
    logger.info('Migration', 'staff_passwords table created successfully')
    
  } catch (error) {
    logger.error('Migration', 'Failed to create staff_passwords table', error)
    throw error
  }
}

export async function generateStaffPasswords() {
  try {
    logger.info('Migration', 'Generating passwords for all staff members')
    
    // Get all staff members
    const staff = await sql`
      SELECT s.id, s.name, s.hospital_id, h.name as hospital_name
      FROM staff s
      JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.is_active = true
      ORDER BY s.hospital_id, s.name
    `
    
    logger.info('Migration', `Found ${staff.length} staff members to generate passwords for`)
    
    // Generate unique passwords for each staff member
    const usedPasswords = new Set()
    const passwordsGenerated = []
    
    for (const member of staff) {
      let password = generateUniquePassword(member.name, member.hospital_id, usedPasswords)
      
      // Hash the password for storage
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Insert into staff_passwords table
      await sql`
        INSERT INTO staff_passwords (staff_id, password_hash, password_plain, hospital_id, is_active)
        VALUES (${member.id}, ${hashedPassword}, ${password}, ${member.hospital_id}, true)
        ON CONFLICT (staff_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          password_plain = EXCLUDED.password_plain,
          updated_at = CURRENT_TIMESTAMP
      `
      
      passwordsGenerated.push({
        staffId: member.id,
        staffName: member.name,
        hospitalName: member.hospital_name,
        password: password
      })
      
      usedPasswords.add(password)
    }
    
    logger.info('Migration', `Generated ${passwordsGenerated.length} staff passwords`)
    
    return passwordsGenerated
    
  } catch (error) {
    logger.error('Migration', 'Failed to generate staff passwords', error)
    throw error
  }
}

function generateUniquePassword(staffName: string, hospitalId: number, usedPasswords: Set<string>): string {
  // Extract initials from name
  const nameParts = staffName.split(' ')
  let initials = ''
  
  // Try to extract meaningful initials
  for (const part of nameParts) {
    if (part.length > 0 && !part.startsWith('Dr.') && !part.startsWith('Biol.') && !part.startsWith('Ch.')) {
      initials += part[0].toUpperCase()
    }
  }
  
  // Ensure we have at least 2 characters
  if (initials.length < 2) {
    initials = staffName.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  }
  
  // Generate password: 2 initials + 1 number
  let attempts = 0
  while (attempts < 100) {
    const number = Math.floor(Math.random() * 10)
    const password = initials.substring(0, 2) + number
    
    if (!usedPasswords.has(password)) {
      return password
    }
    attempts++
  }
  
  // Fallback: use random characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let password = ''
  for (let i = 0; i < 2; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  password += Math.floor(Math.random() * 10)
  
  return password
}

export async function runStaffPasswordMigration() {
  try {
    logger.info('Migration', 'Starting staff password migration')
    
    await createStaffPasswordsTable()
    const passwords = await generateStaffPasswords()
    
    logger.info('Migration', 'Staff password migration completed successfully')
    
    // Log passwords for manager reference (in development)
    console.log('\n=== STAFF PASSWORDS GENERATED ===')
    let currentHospital = ''
    passwords.forEach(p => {
      if (p.hospitalName !== currentHospital) {
        console.log(`\n--- ${p.hospitalName} ---`)
        currentHospital = p.hospitalName
      }
      console.log(`${p.password} → ${p.staffName}`)
    })
    console.log('\n=== END STAFF PASSWORDS ===\n')
    
    return passwords
    
  } catch (error) {
    logger.error('Migration', 'Staff password migration failed', error)
    throw error
  }
}