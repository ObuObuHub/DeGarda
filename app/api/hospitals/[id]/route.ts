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
    
    // Only admins can update hospitals
    if (authUser.role !== 'admin') {
      logger.warn('HospitalUpdate', 'Unauthorized update attempt', {
        userId: authUser.userId,
        role: authUser.role
      })
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    try {
      const body = await request.json()
      const { name } = body
      const hospitalId = parseInt(params.id)
      
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        )
      }
      
      // Check if hospital exists
      const existing = await sql`
        SELECT id FROM hospitals WHERE id = ${hospitalId}
      `
      
      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Hospital not found' },
          { status: 404 }
        )
      }
      
      const result = await sql`
        UPDATE hospitals
        SET name = ${name}
        WHERE id = ${hospitalId}
        RETURNING id, name, city, created_at
      `
      
      const hospital = result[0]
      
      // Get staff count
      const staffCount = await sql`
        SELECT COUNT(*) as count
        FROM staff
        WHERE hospital_id = ${hospitalId}
      `
      
      // Count distinct departments for this hospital
      const departmentCount = await sql`
        SELECT COUNT(DISTINCT specialization) as count
        FROM staff
        WHERE hospital_id = ${hospitalId}
        AND specialization IS NOT NULL
        AND specialization != ''
      `
      
      logger.info('HospitalUpdate', 'Hospital updated', {
        hospitalId,
        newName: name,
        updatedBy: authUser.userId,
        updatedByName: authUser.name
      })
      
      return NextResponse.json({
        ...hospital,
        id: hospital.id.toString(),
        staff: parseInt(staffCount[0].count),
        departments: parseInt(departmentCount[0].count)
      })
    } catch (error) {
      logger.error('HospitalUpdate', 'Failed to update hospital', error, {
        userId: authUser.userId
      })
      return NextResponse.json(
        { error: 'Failed to update hospital' },
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
    
    // Only admins can delete hospitals
    if (authUser.role !== 'admin') {
      logger.warn('HospitalDelete', 'Unauthorized deletion attempt', {
        userId: authUser.userId,
        role: authUser.role
      })
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    try {
      const hospitalId = parseInt(params.id)
      
      // Prevent deletion of System Default hospital
      if (hospitalId === 1) {
        return NextResponse.json(
          { error: 'Cannot delete System Default hospital' },
          { status: 400 }
        )
      }
      
      // Get hospital info for logging
      const hospitalInfo = await sql`
        SELECT name FROM hospitals WHERE id = ${hospitalId}
      `
      
      if (hospitalInfo.length === 0) {
        return NextResponse.json(
          { error: 'Hospital not found' },
          { status: 404 }
        )
      }
      
      const hospitalName = hospitalInfo[0].name
      
      logger.warn('HospitalDelete', 'Starting cascade deletion of hospital', {
        hospitalId,
        hospitalName,
        deletedBy: authUser.userId,
        deletedByName: authUser.name
      })
      
      // Start transaction for cascade deletion
      // Delete in order of dependencies
      
      // 1. Delete shift swaps related to shifts in this hospital
      await sql`
        DELETE FROM shift_swaps
        WHERE shift_id IN (
          SELECT id FROM shifts WHERE hospital_id = ${hospitalId}
        )
      `
      
      // 2. Delete reservations for this hospital (if table exists)
      try {
        await sql`
          DELETE FROM reservations
          WHERE hospital_id = ${hospitalId}
        `
      } catch (e) {
        // Table might not exist, continue
      }
      
      // 3. Delete shifts for this hospital
      await sql`
        DELETE FROM shifts
        WHERE hospital_id = ${hospitalId}
      `
      
      // 4. Delete staff members from this hospital
      const deletedStaff = await sql`
        DELETE FROM staff
        WHERE hospital_id = ${hospitalId}
        RETURNING id, name
      `
      
      // 5. Finally delete the hospital
      await sql`
        DELETE FROM hospitals
        WHERE id = ${hospitalId}
      `
      
      logger.info('HospitalDelete', 'Hospital and all related data deleted', {
        hospitalId,
        hospitalName,
        deletedStaffCount: deletedStaff.length,
        deletedBy: authUser.userId,
        deletedByName: authUser.name
      })
      
      return NextResponse.json({ 
        success: true,
        message: `Hospital "${hospitalName}" and all related data (${deletedStaff.length} staff members) have been permanently deleted`
      })
    } catch (error: any) {
      logger.error('HospitalDelete', 'Failed to delete hospital', error, {
        userId: authUser.userId,
        hospitalId: params.id,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetail: error?.detail
      })
      
      // Return more detailed error for debugging
      return NextResponse.json(
        { 
          error: 'Failed to delete hospital',
          details: process.env.NODE_ENV === 'development' ? {
            message: error?.message,
            code: error?.code,
            detail: error?.detail
          } : undefined
        },
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
  
  return withHospitalAuth(request, async (authUser) => {
    
    try {
      const hospitalId = parseInt(params.id)
      
      // Check if user can access this hospital
      if (authUser.role !== 'admin' && authUser.hospitalId !== hospitalId) {
        return NextResponse.json(
          { error: 'Access denied to this hospital' },
          { status: 403 }
        )
      }
      
      // Get hospital data
      const result = await sql`
        SELECT id, name, city, created_at
        FROM hospitals
        WHERE id = ${hospitalId}
      `
      
      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Hospital not found' },
          { status: 404 }
        )
      }
      
      const hospital = result[0]
      
      // Get staff count
      const staffCount = await sql`
        SELECT COUNT(*) as count
        FROM staff
        WHERE hospital_id = ${hospitalId}
      `
      
      // Count distinct departments for this hospital
      const departmentCount = await sql`
        SELECT COUNT(DISTINCT specialization) as count
        FROM staff
        WHERE hospital_id = ${hospitalId}
        AND specialization IS NOT NULL
        AND specialization != ''
      `
      
      return NextResponse.json({
        id: hospital.id.toString(),
        name: hospital.name,
        city: hospital.city,
        staff: parseInt(staffCount[0].count),
        departments: parseInt(departmentCount[0].count),
        created_at: hospital.created_at
      })
    } catch (error) {
      logger.error('HospitalGet', 'Failed to fetch hospital', error, {
        userId: authUser.userId,
        hospitalId: params.id
      })
      return NextResponse.json(
        { error: 'Failed to fetch hospital' },
        { status: 500 }
      )
    }
  })
}