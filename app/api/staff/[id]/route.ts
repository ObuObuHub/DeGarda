import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  return withHospitalAuth(request, async (authUser) => {
    
    // Only admins and managers can update staff
    if (!['admin', 'manager'].includes(authUser.role)) {
      logger.warn('StaffUpdate', 'Unauthorized update attempt', {
        userId: authUser.userId,
        role: authUser.role
      })
      return NextResponse.json(
        { error: 'Admin or Manager access required' },
        { status: 403 }
      )
    }
    
    try {
      const body = await request.json()
      const { name, email, type, specialization, hospitalId, role } = body
      const staffId = parseInt(params.id)
      
      if (!name || !email || !type || !hospitalId) {
        return NextResponse.json(
          { error: 'Name, email, type, and hospital are required' },
          { status: 400 }
        )
      }
      
      // Check if staff exists and get current info
      const existing = await sql`
        SELECT id, hospital_id, role as current_role FROM staff WHERE id = ${staffId}
      `
      
      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }
      
      const currentStaff = existing[0]
      
      // Managers can only update staff from their own hospital
      if (authUser.role === 'manager' && currentStaff.hospital_id !== authUser.hospitalId) {
        logger.warn('StaffUpdate', 'Manager attempted to update staff from different hospital', {
          managerId: authUser.userId,
          targetStaffId: staffId,
          targetHospitalId: currentStaff.hospital_id,
          managerHospitalId: authUser.hospitalId
        })
        return NextResponse.json(
          { error: 'Cannot update staff from different hospital' },
          { status: 403 }
        )
      }
      
      // Only admins can change roles
      const finalRole = authUser.role === 'admin' ? (role || 'staff') : currentStaff.current_role
      
      // Check if email is being changed and already exists
      const emailCheck = await sql`
        SELECT id FROM staff WHERE email = ${email} AND id != ${staffId}
      `
      
      if (emailCheck.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
      
      const result = await sql`
        UPDATE staff
        SET 
          name = ${name},
          email = ${email},
          role = ${finalRole},
          hospital_id = ${parseInt(hospitalId)},
          specialization = ${specialization}
        WHERE id = ${staffId}
        RETURNING id, name, email, role, hospital_id, specialization, is_active, created_at
      `
      
      const staff = result[0]
      
      logger.info('StaffUpdate', 'Staff member updated', {
        staffId,
        updatedBy: authUser.userId,
        updatedByName: authUser.name,
        changes: {
          role: currentStaff.current_role !== finalRole ? `${currentStaff.current_role} → ${finalRole}` : undefined
        }
      })
      
      return NextResponse.json({
        id: staff.id.toString(),
        name: staff.name,
        email: staff.email,
        type,
        specialization: staff.specialization || '',
        hospitalId: staff.hospital_id.toString(),
        role: staff.role
      })
    } catch (error) {
      logger.error('StaffUpdate', 'Failed to update staff member', error, {
        userId: authUser.userId,
        staffId: params.id
      })
      return NextResponse.json(
        { error: 'Failed to update staff member' },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  return withHospitalAuth(request, async (authUser) => {
    
    // Only admins and managers can delete staff
    if (!['admin', 'manager'].includes(authUser.role)) {
      logger.warn('StaffDelete', 'Unauthorized deletion attempt', {
        userId: authUser.userId,
        role: authUser.role
      })
      return NextResponse.json(
        { error: 'Admin or Manager access required' },
        { status: 403 }
      )
    }
    
    try {
      const staffId = parseInt(params.id)
      
      // Get staff info and verify they belong to accessible hospital
      const staffInfo = await sql`
        SELECT name, hospital_id, role 
        FROM staff 
        WHERE id = ${staffId}
      `
      
      if (staffInfo.length === 0) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }
      
      const staff = staffInfo[0]
      
      // Managers can only delete staff from their own hospital
      if (authUser.role === 'manager' && staff.hospital_id !== authUser.hospitalId) {
        logger.warn('StaffDelete', 'Manager attempted to delete staff from different hospital', {
          managerId: authUser.userId,
          targetStaffId: staffId,
          targetHospitalId: staff.hospital_id,
          managerHospitalId: authUser.hospitalId
        })
        return NextResponse.json(
          { error: 'Cannot delete staff from different hospital' },
          { status: 403 }
        )
      }
      
      // Prevent deletion of admin users (safety check)
      if (staff.role === 'admin') {
        return NextResponse.json(
          { error: 'Cannot delete admin users' },
          { status: 400 }
        )
      }
      
      logger.warn('StaffDelete', 'Starting cascade deletion of staff member', {
        staffId,
        staffName: staff.name,
        deletedBy: authUser.userId,
        deletedByName: authUser.name
      })
      
      // Cascade delete all related data
      
      // 1. Delete shift swaps where this staff is involved
      await sql`
        DELETE FROM shift_swaps
        WHERE from_staff_id = ${staffId} OR to_staff_id = ${staffId}
      `
      
      // 2. Delete reservations for this staff
      await sql`
        DELETE FROM reservations
        WHERE staff_id = ${staffId}
      `
      
      // 3. Delete shift permissions for this staff
      await sql`
        DELETE FROM shift_permissions
        WHERE staff_id = ${staffId}
      `
      
      // 4. Remove staff from assigned shifts (set to null)
      await sql`
        UPDATE shifts
        SET staff_id = NULL
        WHERE staff_id = ${staffId}
      `
      
      // 5. Finally, permanently delete the staff member
      await sql`
        DELETE FROM staff
        WHERE id = ${staffId}
      `
      
      logger.info('StaffDelete', 'Staff member permanently deleted', {
        staffId,
        staffName: staff.name,
        deletedBy: authUser.userId,
        deletedByName: authUser.name,
        hospitalId: staff.hospital_id
      })
      
      return NextResponse.json({ 
        success: true,
        message: `Staff member "${staff.name}" has been permanently deleted`
      })
    } catch (error) {
      logger.error('StaffDelete', 'Failed to delete staff member', error, {
        userId: authUser.userId,
        staffId: params.id
      })
      return NextResponse.json(
        { error: 'Failed to delete staff member' },
        { status: 500 }
      )
    }
  })
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const staffId = parseInt(params.id)
    
    // Get staff data with hospital info
    const result = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.role,
        s.hospital_id,
        s.specialization,
        s.is_active,
        s.created_at,
        h.name as hospital_name
      FROM staff s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.id = ${staffId}
    `
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }
    
    const staff = result[0]
    
    return NextResponse.json({
      id: staff.id.toString(),
      name: staff.name,
      email: staff.email,
      role: staff.role,
      type: 'doctor',
      specialization: staff.specialization || '',
      hospitalId: staff.hospital_id?.toString() || '',
      hospitalName: staff.hospital_name || '',
      isActive: staff.is_active,
      createdAt: staff.created_at
    })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff member' },
      { status: 500 }
    )
  }
}