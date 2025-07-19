/**
 * Script to create test access codes for development
 * Run with: node scripts/setup-test-access-codes.js
 */

const { neon } = require('@neondatabase/serverless')
const bcrypt = require('bcryptjs')

// Get database URL from environment (Neon PostgreSQL)
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required")
  console.error("Please set DATABASE_URL in your .env.local file")
  process.exit(1)
}const sql = neon(DATABASE_URL)

async function setupTestAccessCodes() {
  console.log('🚀 Setting up test access codes...')
  
  try {
    // First, check if access_codes table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'access_codes'
      )
    `
    
    if (!tableCheck[0].exists) {
      console.log('📋 Creating access_codes table...')
      
      await sql`
        CREATE TABLE access_codes (
          id SERIAL PRIMARY KEY,
          code_hash VARCHAR(255) NOT NULL,
          hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
          role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'manager')),
          staff_id INTEGER REFERENCES staff(id),
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      
      await sql`CREATE INDEX idx_access_codes_hospital ON access_codes(hospital_id)`
      await sql`CREATE INDEX idx_access_codes_role ON access_codes(role)`
      await sql`CREATE INDEX idx_access_codes_active ON access_codes(is_active)`
      
      console.log('✅ Access codes table created')
    } else {
      console.log('ℹ️  Access codes table already exists')
    }
    
    // Get hospitals
    const hospitals = await sql`SELECT id, name FROM hospitals ORDER BY id`
    console.log(`🏥 Found ${hospitals.length} hospitals`)
    
    // Create test access codes for each hospital
    const testCodes = [
      { code: 'ab1', role: 'staff' },
      { code: 'cd2', role: 'staff' },
      { code: 'ef3', role: 'staff' },
      { code: 'admin1', role: 'manager' },
      { code: 'mgr123', role: 'manager' }
    ]
    
    for (const hospital of hospitals) {
      console.log(`\n🏥 Setting up codes for ${hospital.name} (ID: ${hospital.id})`)
      
      for (const testCode of testCodes) {
        // Check if code already exists for this hospital/role
        const existing = await sql`
          SELECT id FROM access_codes 
          WHERE hospital_id = ${hospital.id} AND role = ${testCode.role}
          LIMIT 1
        `
        
        if (existing.length === 0) {
          const hashedCode = await bcrypt.hash(testCode.code, 10)
          
          await sql`
            INSERT INTO access_codes (code_hash, hospital_id, role, is_active)
            VALUES (${hashedCode}, ${hospital.id}, ${testCode.role}, true)
          `
          
          console.log(`  ✅ Created ${testCode.role} code: ${testCode.code}`)
        } else {
          console.log(`  ℹ️  ${testCode.role} code already exists`)
        }
      }
    }
    
    console.log('\n🎉 Test access codes setup complete!')
    console.log('\n📋 Test credentials:')
    console.log('Staff codes: ab1, cd2, ef3')
    console.log('Manager codes: admin1, mgr123')
    console.log('\n🔗 To test: http://localhost:3000')
    
  } catch (error) {
    console.error('❌ Error setting up access codes:', error)
    process.exit(1)
  }
}

setupTestAccessCodes()