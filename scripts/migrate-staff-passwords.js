/**
 * Script to migrate to staff-specific password authentication
 * Run with: node scripts/migrate-staff-passwords.js
 */

const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required")
  console.error("Please set DATABASE_URL in your .env.local file")
  process.exit(1)
}const sql = neon(DATABASE_URL)

async function createStaffPasswordsTable() {
  console.log('📋 Creating staff_passwords table...')
  
  try {
    // Create the staff_passwords table
    await sql`
      CREATE TABLE IF NOT EXISTS staff_passwords (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        password_plain VARCHAR(10) NOT NULL,
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id),
        UNIQUE(password_plain, hospital_id)
      )
    `
    
    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_staff ON staff_passwords(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_hospital ON staff_passwords(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_staff_passwords_active ON staff_passwords(is_active)`
    
    console.log('✅ staff_passwords table created successfully')
    
  } catch (error) {
    console.error('❌ Failed to create staff_passwords table:', error)
    throw error
  }
}

function generateUniquePassword(staffName, hospitalId, usedPasswords) {
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

async function generateStaffPasswords() {
  console.log('🔐 Generating passwords for all staff members...')
  
  try {
    // Get all staff members
    const staff = await sql`
      SELECT s.id, s.name, s.hospital_id, h.name as hospital_name
      FROM staff s
      JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.is_active = true
      ORDER BY s.hospital_id, s.name
    `
    
    console.log(`📊 Found ${staff.length} staff members to generate passwords for`)
    
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
    
    console.log(`✅ Generated ${passwordsGenerated.length} staff passwords`)
    
    return passwordsGenerated
    
  } catch (error) {
    console.error('❌ Failed to generate staff passwords:', error)
    throw error
  }
}

async function runStaffPasswordMigration() {
  console.log('🚀 Starting staff password migration...')
  
  try {
    await createStaffPasswordsTable()
    const passwords = await generateStaffPasswords()
    
    console.log('✅ Staff password migration completed successfully')
    
    // Log passwords for manager reference
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
    console.error('❌ Staff password migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runStaffPasswordMigration()