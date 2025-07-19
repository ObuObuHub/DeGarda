/**
 * Script to create shift_generation_permissions table
 * Run with: node scripts/create-shift-permissions-table.js
 */

const { neon } = require('@neondatabase/serverless')

// Get database URL from environment - NEVER hardcode credentials!
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required')
  console.error('Please set DATABASE_URL in your .env.local file')
  process.exit(1)
}
const sql = neon(DATABASE_URL)

async function createShiftPermissionsTable() {
  console.log('🚀 Creating shift_generation_permissions table...')
  
  try {
    // Create the shift_generation_permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS shift_generation_permissions (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        department VARCHAR(255) NOT NULL,
        granted_by INTEGER NOT NULL REFERENCES staff(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, hospital_id, department)
      )
    `
    
    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_shift_permissions_staff ON shift_generation_permissions(staff_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shift_permissions_hospital ON shift_generation_permissions(hospital_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shift_permissions_department ON shift_generation_permissions(department)`
    await sql`CREATE INDEX IF NOT EXISTS idx_shift_permissions_active ON shift_generation_permissions(is_active)`
    
    console.log('✅ shift_generation_permissions table created successfully')
    
    // Display table structure
    console.log('\n📋 Table structure:')
    console.log('- staff_id: References staff member who can generate shifts')
    console.log('- hospital_id: Hospital where permission applies')
    console.log('- department: Department where staff can generate shifts')
    console.log('- granted_by: Manager who granted the permission')
    console.log('- is_active: Whether permission is currently active')
    
    console.log('\n🎯 Permission rules:')
    console.log('- Hospital 5 (Piatra-Neamț): Only LABORATOR department')
    console.log('- Hospital 6 (Buhuși): ATI, Urgențe, Chirurgie, Medicină Internă departments')
    console.log('- Staff can only generate shifts for their own department')
    console.log('- Managers can grant permissions only to staff in their hospital')
    
  } catch (error) {
    console.error('❌ Error creating shift_generation_permissions table:', error)
    process.exit(1)
  }
}

// Run the script
createShiftPermissionsTable()