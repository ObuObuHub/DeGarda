import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      // Only admin can assign manager roles
      if (authUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admin can assign manager roles' },
          { status: 403 }
        )
      }

      const { staffId, action } = await request.json()
      
      if (!staffId || !action || !['assign', 'remove'].includes(action)) {
        return NextResponse.json(
          { error: 'staffId and action (assign/remove) are required' },
          { status: 400 }
        )
      }

      // Get staff member details
      const staffResult = await sql`
        SELECT id, name, email, role, specialization, hospital_id
        FROM staff
        WHERE id = ${staffId} AND is_active = true
      `

      if (staffResult.length === 0) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      const staff = staffResult[0]
      
      // Don't allow changing admin role
      if (staff.role === 'admin') {
        return NextResponse.json(
          { error: 'Cannot modify admin role' },
          { status: 400 }
        )
      }

      const newRole = action === 'assign' ? 'manager' : 'staff'
      
      // Update the staff member's role
      await sql`
        UPDATE staff
        SET role = ${newRole}
        WHERE id = ${staffId}
      `

      logger.info('AdminAPI', `Manager role ${action}ed`, {
        staffId: staff.id,
        staffName: staff.name,
        newRole,
        specialization: staff.specialization,
        hospitalId: staff.hospital_id,
        actionBy: authUser.userId
      })

      return NextResponse.json({
        success: true,
        message: `Manager role ${action === 'assign' ? 'assigned to' : 'removed from'} ${staff.name}`,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: newRole,
          specialization: staff.specialization,
          hospitalId: staff.hospital_id
        }
      })

    } catch (error) {
      logger.error('AdminAPI', 'Failed to assign manager role', { error, userId: authUser.userId })
      return NextResponse.json(
        { error: 'Failed to update manager role' },
        { status: 500 }
      )
    }
  })
}