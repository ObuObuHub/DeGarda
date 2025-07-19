import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const hospitalIdParam = searchParams.get('hospitalId')
      
      // Use authenticated user's hospital if no hospitalId specified
      let targetHospitalId = authUser.hospitalId
      
      if (hospitalIdParam) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam, authUser.role)
        if (!validation.valid) {
          logger.warn('ShiftPermissionsAPI', 'Hospital access denied', {
            userId: authUser.userId,
            userHospital: authUser.hospitalId,
            requestedHospital: hospitalIdParam,
            error: validation.error
          })
          return NextResponse.json(
            { error: validation.error },
            { status: 403 }
          )
        }
        targetHospitalId = validation.hospitalId!
      }
      
      // Get all staff in the hospital with their current permissions
      const staffWithPermissions = await sql`
        SELECT 
          s.id,
          s.name,
          s.specialization,
          s.role,
          s.hospital_id,
          h.name as hospital_name,
          sp.password_plain,
          COALESCE(
            JSON_AGG(
              CASE WHEN sgp.is_active = true THEN
                JSON_BUILD_OBJECT(
                  'id', sgp.id,
                  'department', sgp.department,
                  'granted_by', sgp.granted_by,
                  'granted_at', sgp.created_at
                )
              END
            ) FILTER (WHERE sgp.is_active = true), 
            '[]'
          ) as permissions
        FROM staff s
        JOIN hospitals h ON s.hospital_id = h.id
        LEFT JOIN staff_passwords sp ON s.id = sp.staff_id
        LEFT JOIN shift_generation_permissions sgp ON s.id = sgp.staff_id
        WHERE s.hospital_id = ${targetHospitalId}
        AND s.is_active = true
        AND s.role = 'staff'
        GROUP BY s.id, s.name, s.specialization, s.role, s.hospital_id, h.name, sp.password_plain
        ORDER BY s.name
      `
      
      return NextResponse.json({ 
        success: true, 
        staff: staffWithPermissions,
        hospitalId: targetHospitalId 
      })
    } catch (error) {
      logger.error('ShiftPermissionsAPI', 'Failed to fetch staff permissions', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Failed to fetch staff permissions' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      const { action, staffId, department, hospitalId } = body
      
      // Validate hospital access if specified
      let targetHospitalId = authUser.hospitalId
      if (hospitalId) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalId, authUser.role)
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 403 }
          )
        }
        targetHospitalId = validation.hospitalId!
      }
      
      if (action === 'grant') {
        if (!staffId || !department) {
          return NextResponse.json(
            { error: 'Staff ID and department are required' },
            { status: 400 }
          )
        }
        
        // Verify staff belongs to the target hospital
        const staffCheck = await sql`
          SELECT s.id, s.name, s.specialization, s.hospital_id
          FROM staff s
          WHERE s.id = ${staffId} 
          AND s.hospital_id = ${targetHospitalId}
          AND s.is_active = true
          AND s.role = 'staff'
        `
        
        if (staffCheck.length === 0) {
          return NextResponse.json(
            { error: 'Staff member not found in this hospital' },
            { status: 404 }
          )
        }
        
        const staff = staffCheck[0]
        
        // Validate department permissions based on hospital
        const validDepartments = await getValidDepartmentsForHospital(targetHospitalId)
        if (!validDepartments.includes(department)) {
          return NextResponse.json(
            { error: `Invalid department for this hospital. Valid departments: ${validDepartments.join(', ')}` },
            { status: 400 }
          )
        }
        
        // Check if staff member is in the requested department
        if (staff.specialization !== department) {
          return NextResponse.json(
            { error: `Staff member ${staff.name} is in ${staff.specialization} department, not ${department}` },
            { status: 400 }
          )
        }
        
        // Grant permission
        await sql`
          INSERT INTO shift_generation_permissions (staff_id, hospital_id, department, granted_by, is_active)
          VALUES (${staffId}, ${targetHospitalId}, ${department}, ${authUser.userId}, true)
          ON CONFLICT (staff_id, hospital_id, department) DO UPDATE SET
            is_active = true,
            granted_by = ${authUser.userId},
            updated_at = CURRENT_TIMESTAMP
        `
        
        logger.info('ShiftPermissionsAPI', 'Shift generation permission granted', {
          staffId,
          staffName: staff.name,
          department,
          hospitalId: targetHospitalId,
          grantedBy: authUser.userId
        })
        
        return NextResponse.json({
          success: true,
          message: `Shift generation permission granted to ${staff.name} for ${department} department`
        })
      }
      
      if (action === 'revoke') {
        if (!staffId || !department) {
          return NextResponse.json(
            { error: 'Staff ID and department are required' },
            { status: 400 }
          )
        }
        
        // Revoke permission
        const result = await sql`
          UPDATE shift_generation_permissions
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE staff_id = ${staffId} 
          AND hospital_id = ${targetHospitalId}
          AND department = ${department}
          AND is_active = true
        `
        
        if (result.count === 0) {
          return NextResponse.json(
            { error: 'Permission not found or already revoked' },
            { status: 404 }
          )
        }
        
        logger.info('ShiftPermissionsAPI', 'Shift generation permission revoked', {
          staffId,
          department,
          hospitalId: targetHospitalId,
          revokedBy: authUser.userId
        })
        
        return NextResponse.json({
          success: true,
          message: 'Shift generation permission revoked successfully'
        })
      }
      
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
      
    } catch (error) {
      logger.error('ShiftPermissionsAPI', 'Shift permission operation failed', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

async function getValidDepartmentsForHospital(hospitalId: number): Promise<string[]> {
  // Hospital 5 (Piatra-Neamț) - Only LABORATOR
  if (hospitalId === 5) {
    return ['Laborator']
  }
  
  // Hospital 6 (Buhuși) - Multiple departments
  if (hospitalId === 6) {
    return ['ATI', 'Urgențe', 'Chirurgie', 'Medicină Internă']
  }
  
  // Default fallback
  return ['Laborator']
}