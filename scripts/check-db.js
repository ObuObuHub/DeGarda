require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function checkDB() {
  try {
    const hospitals = await sql`SELECT * FROM hospitals ORDER BY id`
    console.log('All hospitals:')
    hospitals.forEach(h => {
      console.log(`- ID: ${h.id}, Name: ${h.name}, Access Code: ${h.access_code}`)
    })
    
    const staff = await sql`SELECT id, name, role, hospital_id, access_code FROM staff WHERE role IN ('admin', 'manager') ORDER BY role, hospital_id`
    console.log('\nAll staff (admin/manager):')
    staff.forEach(s => {
      console.log(`- ID: ${s.id}, Name: ${s.name}, Role: ${s.role}, Hospital: ${s.hospital_id}, Access Code: ${s.access_code}`)
    })
  } catch (error) {
    console.error('❌ Failed:', error)
  }
}

checkDB()