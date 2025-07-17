require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')
const fs = require('fs')

const sql = neon(process.env.DATABASE_URL)

async function applyReservationsMigration() {
  try {
    console.log('🗄️ Creating reservations table...')
    
    const migrationSQL = fs.readFileSync('migrations/010_create_reservations_table.sql', 'utf-8')
    
    // Split into individual statements and execute
    const statements = migrationSQL.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.slice(0, 60) + '...')
        await sql.query(statement)
      }
    }
    
    console.log('✅ Reservations table created successfully!')
    
    // Verify the table was created
    const reservations = await sql`SELECT COUNT(*) as count FROM reservations`
    console.log(`📊 Reservations table has ${reservations[0].count} records`)
    
    // Show sample reservations if any
    const sampleReservations = await sql`
      SELECT r.*, s.name as staff_name, h.name as hospital_name
      FROM reservations r
      JOIN staff s ON r.staff_id = s.id
      JOIN hospitals h ON r.hospital_id = h.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `
    
    if (sampleReservations.length > 0) {
      console.log('\n📝 Sample reservations:')
      sampleReservations.forEach(res => {
        console.log(`   ${res.staff_name} → ${res.shift_date} (${res.department}) - ${res.status}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyReservationsMigration()