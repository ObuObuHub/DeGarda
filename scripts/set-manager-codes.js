require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function setManagerCodes() {
  try {
    console.log('Setting individual manager access codes...')
    
    // Set admin access code
    await sql`UPDATE staff SET access_code = 'ADM001' WHERE id = 65` // Administrator Sistem
    
    // Set individual manager access codes
    await sql`UPDATE staff SET access_code = 'MGR101' WHERE id = 66` // Manager Spitalul (Hospital 5)
    await sql`UPDATE staff SET access_code = 'MGR102' WHERE id = 69` // Dr. Gîlea Arina (Hospital 5)
    await sql`UPDATE staff SET access_code = 'MGR201' WHERE id = 67` // Manager Spitalul (Hospital 6)  
    await sql`UPDATE staff SET access_code = 'MGR301' WHERE id = 73` // Dr. Munteanu George (Hospital 7)
    
    console.log('✅ Manager access codes set successfully!')
    
    // Verify the changes
    const hospitals = await sql`SELECT id, name, access_code FROM hospitals WHERE access_code IS NOT NULL ORDER BY id`
    console.log('\nHospitals with access codes:')
    hospitals.forEach(h => {
      console.log(`- ${h.name}: ${h.access_code}`)
    })
    
    const managers = await sql`SELECT id, name, role, access_code, hospital_id FROM staff WHERE role IN ('admin', 'manager') AND access_code IS NOT NULL ORDER BY role, hospital_id`
    console.log('\nManagers/Admins with access codes:')
    managers.forEach(m => {
      console.log(`- ${m.name} (${m.role}) - Hospital ${m.hospital_id}: ${m.access_code}`)
    })
    
    console.log('\n🎯 ACCESS CODES SUMMARY:')
    console.log('Staff Login (Hospital Access):')
    console.log('- Piatra-Neamț staff: LAB')
    console.log('- Buhuși staff (old): BUH1') 
    console.log('- Buhuși staff (new): BUH2')
    console.log('\nManager/Admin Login:')
    console.log('- Administrator Sistem: ADM001')
    console.log('- Manager Piatra-Neamț (66): MGR101')
    console.log('- Dr. Gîlea Arina: MGR102')
    console.log('- Manager Buhuși (67): MGR201')
    console.log('- Dr. Munteanu George: MGR301')
    
  } catch (error) {
    console.error('❌ Failed to set manager codes:', error)
    process.exit(1)
  }
}

setManagerCodes()