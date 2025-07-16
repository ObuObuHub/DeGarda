import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      // Get staff member's shift generation permissions
      const permissions = await sql`
        SELECT 
          sgp.id,
          sgp.department,
          sgp.granted_by,
          sgp.created_at,
          s.name as granted_by_name
        FROM shift_generation_permissions sgp
        JOIN staff s ON sgp.granted_by = s.id
        WHERE sgp.staff_id = ${authUser.userId}
        AND sgp.hospital_id = ${authUser.hospitalId}
        AND sgp.is_active = true
      `
      
      // Get staff member's department
      const staffInfo = await sql`
        SELECT specialization as department
        FROM staff
        WHERE id = ${authUser.userId}
        AND is_active = true
      `
      
      const staffDepartment = staffInfo.length > 0 ? staffInfo[0].department : null
      
      return NextResponse.json({ 
        success: true, 
        permissions,
        staffDepartment,
        canGenerateShifts: permissions.length > 0
      })
    } catch (error) {
      logger.error('StaffShiftPermissionsAPI', 'Failed to fetch staff permissions', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Failed to fetch shift permissions' },
        { status: 500 }
      )
    }
  })
}