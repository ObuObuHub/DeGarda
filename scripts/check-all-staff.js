require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function checkAllStaff() {
  try {
    console.log('🔍 CHECKING ALL STAFF IN DATABASE')
    console.log('=' .repeat(50))
    
    // Get all staff regardless of role or status
    const allStaff = await sql`
      SELECT s.id, s.name, s.email, s.role, s.hospital_id, s.is_active, h.name as hospital_name
      FROM staff s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      ORDER BY s.role, s.hospital_id, s.name
    `
    
    console.log(`Total staff records: ${allStaff.length}`)
    console.log()
    
    // Group by role
    const byRole = {}
    allStaff.forEach(staff => {
      if (!byRole[staff.role]) byRole[staff.role] = []
      byRole[staff.role].push(staff)
    })
    
    Object.entries(byRole).forEach(([role, staffList]) => {
      console.log(`📋 ${role.toUpperCase()} (${staffList.length} members):`)
      staffList.forEach(staff => {
        const status = staff.is_active ? '✅ Active' : '❌ Inactive'
        console.log(`   ${staff.name} - Hospital: ${staff.hospital_name || 'Unknown'} - ${status}`)
      })
      console.log()
    })
    
    // Check for staff role specifically
    const regularStaff = allStaff.filter(s => s.role === 'staff')
    console.log(`🏥 REGULAR STAFF MEMBERS: ${regularStaff.length}`)
    
    if (regularStaff.length === 0) {
      console.log('❌ NO REGULAR STAFF FOUND!')
      console.log('This explains why hospital access codes fail to load staff.')
      console.log('Need to either:')
      console.log('1. Create regular staff members with role="staff"')
      console.log('2. Modify hospital access code system to work without individual staff')
    } else {
      console.log('✅ Regular staff members exist:')
      regularStaff.forEach(staff => {
        console.log(`   ${staff.name} - ${staff.hospital_name} - ${staff.is_active ? 'Active' : 'Inactive'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to check staff:', error)
  }
}

checkAllStaff()