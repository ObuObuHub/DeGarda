import { NextRequest, NextResponse } from 'next/server'
import { staffPasswordManager } from '@/lib/staffPasswordManager'
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
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam)
        if (!validation.valid) {
          logger.warn('StaffPasswordsAPI', 'Hospital access denied', {
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
      
      const passwords = await staffPasswordManager.getHospitalStaffPasswords(targetHospitalId)
      
      return NextResponse.json({ success: true, passwords })
    } catch (error) {
      logger.error('StaffPasswordsAPI', 'Failed to fetch staff passwords', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Failed to fetch staff passwords' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      const { action, staffId, hospitalId } = body
      
      if (action === 'regenerate') {
        if (!staffId) {
          return NextResponse.json(
            { error: 'Staff ID is required' },
            { status: 400 }
          )
        }
        
        // Validate hospital access if specified
        let targetHospitalId = authUser.hospitalId
        if (hospitalId) {
          const validation = validateHospitalParam(authUser.hospitalId, hospitalId)
          if (!validation.valid) {
            return NextResponse.json(
              { error: validation.error },
              { status: 403 }
            )
          }
          targetHospitalId = validation.hospitalId!
        }
        
        // Verify staff belongs to the target hospital
        const staffCheck = await staffPasswordManager.getHospitalStaffPasswords(targetHospitalId)
        const staffExists = staffCheck.find(s => s.staffId === parseInt(staffId))
        
        if (!staffExists) {
          return NextResponse.json(
            { error: 'Staff member not found in this hospital' },
            { status: 404 }
          )
        }
        
        const newPassword = await staffPasswordManager.generatePasswordForStaff(parseInt(staffId))
        
        if (newPassword) {
          logger.info('StaffPasswordsAPI', 'Password regenerated for staff', {
            staffId,
            hospitalId: targetHospitalId,
            userId: authUser.userId
          })
          
          return NextResponse.json({
            success: true,
            password: newPassword,
            message: 'Password regenerated successfully'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to generate new password' },
            { status: 500 }
          )
        }
      }
      
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
      
    } catch (error) {
      logger.error('StaffPasswordsAPI', 'Staff password operation failed', { 
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