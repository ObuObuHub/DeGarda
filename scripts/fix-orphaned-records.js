require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function fixOrphanedRecords() {
  try {
    console.log('🔧 Fixing orphaned database records...')
    
    // Check and fix orphaned staff records
    const orphanedStaff = await sql`
      SELECT s.id, s.name, s.hospital_id 
      FROM staff s 
      LEFT JOIN hospitals h ON s.hospital_id = h.id 
      WHERE h.id IS NULL
    `
    
    if (orphanedStaff.length > 0) {
      console.log(`Found ${orphanedStaff.length} orphaned staff records:`)
      orphanedStaff.forEach(staff => {
        console.log(`   - ${staff.name} (ID: ${staff.id}, Hospital ID: ${staff.hospital_id})`)
      })
      
      // Assign orphaned staff to default hospital (Piatra-Neamț)
      await sql`
        UPDATE staff 
        SET hospital_id = 5 
        WHERE id IN (
          SELECT s.id 
          FROM staff s 
          LEFT JOIN hospitals h ON s.hospital_id = h.id 
          WHERE h.id IS NULL
        )
      `
      console.log('✅ Fixed orphaned staff records - assigned to Piatra-Neamț')
    } else {
      console.log('✅ No orphaned staff records found')
    }
    
    // Check and fix orphaned shift records
    const orphanedShifts = await sql`
      SELECT s.id, s.date, s.hospital_id 
      FROM shifts s 
      LEFT JOIN hospitals h ON s.hospital_id = h.id 
      WHERE h.id IS NULL
    `
    
    if (orphanedShifts.length > 0) {
      console.log(`Found ${orphanedShifts.length} orphaned shift records:`)
      orphanedShifts.forEach(shift => {
        console.log(`   - Shift ${shift.date} (ID: ${shift.id}, Hospital ID: ${shift.hospital_id})`)
      })
      
      // Delete orphaned shifts as they can't be properly assigned
      await sql`
        DELETE FROM shifts 
        WHERE id IN (
          SELECT s.id 
          FROM shifts s 
          LEFT JOIN hospitals h ON s.hospital_id = h.id 
          WHERE h.id IS NULL
        )
      `
      console.log('✅ Fixed orphaned shift records - removed invalid shifts')
    } else {
      console.log('✅ No orphaned shift records found')
    }
    
    // Check for any other data consistency issues
    const invalidReservations = await sql`
      SELECT r.id, r.staff_id, r.hospital_id 
      FROM reservations r 
      LEFT JOIN staff s ON r.staff_id = s.id 
      LEFT JOIN hospitals h ON r.hospital_id = h.id 
      WHERE s.id IS NULL OR h.id IS NULL
    `
    
    if (invalidReservations.length > 0) {
      console.log(`Found ${invalidReservations.length} invalid reservations`)
      await sql`
        DELETE FROM reservations 
        WHERE id IN (
          SELECT r.id 
          FROM reservations r 
          LEFT JOIN staff s ON r.staff_id = s.id 
          LEFT JOIN hospitals h ON r.hospital_id = h.id 
          WHERE s.id IS NULL OR h.id IS NULL
        )
      `
      console.log('✅ Fixed invalid reservations')
    } else {
      console.log('✅ All reservations are valid')
    }
    
    console.log('🎉 Database cleanup completed!')
    
  } catch (error) {
    console.error('❌ Failed to fix orphaned records:', error)
    process.exit(1)
  }
}

fixOrphanedRecords()