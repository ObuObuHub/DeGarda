require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function fixAccessCodes() {
  try {
    console.log('Setting hospital access codes...')
    
    // Clear existing access codes first
    await sql`UPDATE hospitals SET access_code = NULL`
    await sql`UPDATE staff SET access_code = NULL WHERE role IN ('admin', 'manager')`
    
    // Set hospital access codes (based on actual hospital IDs)
    await sql`UPDATE hospitals SET access_code = 'LAB' WHERE id = 5` // Piatra-Neamț
    await sql`UPDATE hospitals SET access_code = 'BUH1' WHERE id = 6` // Buhuși 1
    await sql`UPDATE hospitals SET access_code = 'BUH2' WHERE id = 7` // Buhuși 2
    
    // Set manager access codes for Piatra-Neamț 
    await sql`UPDATE staff SET access_code = 'MGR101' WHERE role = 'manager' AND hospital_id = 5`
    
    // Set manager access codes for Buhuși hospitals
    await sql`UPDATE staff SET access_code = 'MGR201' WHERE role = 'manager' AND hospital_id = 6`
    await sql`UPDATE staff SET access_code = 'MGR202' WHERE role = 'manager' AND hospital_id = 7`
    
    // For admin
    await sql`UPDATE staff SET access_code = 'ADM001' WHERE role = 'admin'`
    
    console.log('✅ Access codes updated successfully!')
    
    // Verify the changes
    const hospitals = await sql`SELECT id, name, access_code FROM hospitals WHERE access_code IS NOT NULL`
    console.log('\nHospitals with access codes:')
    hospitals.forEach(h => {
      console.log(`- ${h.name}: ${h.access_code}`)
    })
    
    const managers = await sql`SELECT id, name, role, access_code, hospital_id FROM staff WHERE role IN ('admin', 'manager') AND access_code IS NOT NULL ORDER BY role, id`
    console.log('\nManagers/Admins with access codes:')
    managers.forEach(m => {
      console.log(`- ${m.name} (${m.role}) - Hospital ${m.hospital_id}: ${m.access_code}`)
    })
    
  } catch (error) {
    console.error('❌ Failed to set access codes:', error)
    process.exit(1)
  }
}

fixAccessCodes()