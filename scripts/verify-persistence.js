require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function verifyDataPersistence() {
  try {
    console.log('🔍 Verifying data persistence in database...\n')
    
    // Check hospitals
    console.log('📍 HOSPITALS:')
    const hospitals = await sql`
      SELECT id, name, city, created_at 
      FROM hospitals 
      ORDER BY created_at DESC
    `
    hospitals.forEach(h => {
      console.log(`  - ${h.name} (${h.city}) - ID: ${h.id} - Created: ${h.created_at}`)
    })
    
    // Check staff members
    console.log('\n👥 STAFF MEMBERS:')
    const staff = await sql`
      SELECT s.id, s.name, s.email, s.role, s.access_code, s.specialization, h.name as hospital_name
      FROM staff s
      JOIN hospitals h ON s.hospital_id = h.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `
    staff.forEach(s => {
      console.log(`  - ${s.name} (${s.role}) - ${s.hospital_name} - Code: ${s.access_code}`)
    })
    
    // Check recent reservations
    console.log('\n📅 RECENT RESERVATIONS:')
    const reservations = await sql`
      SELECT r.id, r.shift_date, r.department, s.name as staff_name, h.name as hospital_name
      FROM reservations r
      JOIN staff s ON r.staff_id = s.id
      JOIN hospitals h ON r.hospital_id = h.id
      ORDER BY r.created_at DESC
      LIMIT 5
    `
    reservations.forEach(r => {
      console.log(`  - ${r.staff_name} reserved ${r.shift_date} at ${r.hospital_name}`)
    })
    
    // Check database statistics
    console.log('\n📊 DATABASE STATISTICS:')
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM hospitals) as hospital_count,
        (SELECT COUNT(*) FROM staff) as staff_count,
        (SELECT COUNT(*) FROM reservations) as reservation_count,
        (SELECT COUNT(*) FROM shifts) as shift_count
    `
    const stat = stats[0]
    console.log(`  - Hospitals: ${stat.hospital_count}`)
    console.log(`  - Staff Members: ${stat.staff_count}`)
    console.log(`  - Reservations: ${stat.reservation_count}`)
    console.log(`  - Shifts: ${stat.shift_count}`)
    
    console.log('\n✅ Data persistence verified successfully!')
    
  } catch (error) {
    console.error('❌ Error verifying persistence:', error)
    process.exit(1)
  }
}

verifyDataPersistence()