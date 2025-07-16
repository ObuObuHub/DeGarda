import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'
import { accessCodeManager } from '@/lib/accessCodes'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const hospitalIdParam = searchParams.get('hospitalId')
      
      // Use authenticated user's hospital if no hospitalId specified
      let targetHospitalId = authUser.hospitalId
      
      if (hospitalIdParam) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam)
        if (!validation.valid) {
          logger.warn('StaffAccessCodesAPI', 'Hospital access denied', {
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
      
      logger.info('StaffAccessCodesAPI', 'Fetching staff with actual access codes', { 
        hospitalId: targetHospitalId,
        userId: authUser.userId
      })
      
      // Get actual access codes for the hospital
      const codesData = await accessCodeManager.getHospitalAccessCodes(targetHospitalId)
      
      // Get all staff for the hospital to show complete list
      const allStaff = await sql`
        SELECT id, name, email, specialization, hospital_id
        FROM staff
        WHERE hospital_id = ${targetHospitalId} 
        AND is_active = true
        ORDER BY name
      `
    
      // Create staff list with access code info
      const staffList = allStaff.map(staff => {
        const codeInfo = codesData.find(c => c.staffId === staff.id)
        
        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          specialization: staff.specialization,
          hospitalId: staff.hospital_id,
          hasAccessCode: !!codeInfo,
          accessCode: codeInfo?.accessCode || null,
          codeCreated: codeInfo?.createdAt || null
        }
      })
      
      const stats = {
        total: staffList.length,
        withCodes: staffList.filter(s => s.hasAccessCode).length,
        withoutCodes: staffList.filter(s => !s.hasAccessCode).length
      }
      
      logger.info('StaffAccessCodesAPI', 'Staff access codes fetched', { 
        ...stats,
        hospitalId: targetHospitalId,
        userId: authUser.userId
      })
      
      return NextResponse.json({
        success: true,
        staff: staffList,
        stats
      })
      
    } catch (error) {
      logger.error('StaffAccessCodesAPI', 'Failed to fetch staff access codes', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Failed to fetch staff access codes' },
        { status: 500 }
      )
    }
  })
}