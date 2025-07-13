import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get raw staff data from database
    const staffMembers = await sql`
      SELECT id, name, email, role, hospital_id, specialization, is_active
      FROM staff
      WHERE is_active = true
      LIMIT 10
    `
    
    // Also check if department column exists
    let hasDepartmentColumn = false
    try {
      const deptCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'shifts' 
        AND column_name = 'department'
      `
      hasDepartmentColumn = deptCheck.length > 0
    } catch (e) {
      // Column check failed
    }
    
    return NextResponse.json({
      staffSample: staffMembers,
      hasDepartmentColumn,
      validDepartments: ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie'],
      message: 'Check the specialization field values - they should match the valid departments'
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Failed to debug' }, { status: 500 })
  }
}