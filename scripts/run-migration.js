require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const fs = require('fs')

async function runMigration() {
  try {
    console.log('Running hospital access codes migration...')
    
    const migrationSQL = fs.readFileSync('migrations/009_add_hospital_access_codes.sql', 'utf-8')
    
    // Split into individual statements and execute
    const statements = migrationSQL.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.slice(0, 60) + '...')
        await sql.query(statement)
      }
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Verify the changes
    const hospitals = await sql`SELECT id, name, access_code FROM hospitals`
    console.log('\nHospitals with access codes:')
    hospitals.forEach(h => {
      console.log(`- ${h.name}: ${h.access_code}`)
    })
    
    const managers = await sql`SELECT id, name, role, access_code FROM staff WHERE role IN ('admin', 'manager') ORDER BY role, id`
    console.log('\nManagers/Admins with access codes:')
    managers.forEach(m => {
      console.log(`- ${m.name} (${m.role}): ${m.access_code}`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()