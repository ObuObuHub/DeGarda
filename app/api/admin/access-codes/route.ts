import { NextRequest, NextResponse } from 'next/server'
import { accessCodeManager } from '@/lib/accessCodes'
import { logger } from '@/lib/logger'
import { sql } from '@/lib/db'
import { migrationRunner, migrations } from '@/lib/migrations'
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
          logger.warn('AccessCodeAPI', 'Hospital access denied', {
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
      
      const codes = await accessCodeManager.listHospitalCodes(targetHospitalId)
      
      return NextResponse.json({ success: true, codes })
    } catch (error) {
      logger.error('AccessCodeAPI', 'Failed to list access codes', { 
        error,
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { error: 'Failed to fetch access codes' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      const { action } = body
      
      if (action === 'migrate') {
      // Simplified approach: Just create access_codes table for existing database
      logger.info('AccessCodeAPI', 'Creating access_codes table...')
      
      try {
        // Check if access_codes table already exists
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'access_codes'
          )
        `
        
        if (tableCheck[0].exists) {
          return NextResponse.json({ 
            success: true, 
            message: 'Access codes table already exists - ready to use!' 
          })
        }
        
        // Create access_codes table only
        await sql`
          CREATE TABLE access_codes (
            id SERIAL PRIMARY KEY,
            code_hash VARCHAR(255) NOT NULL,
            hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
            role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'manager')),
            staff_id INTEGER REFERENCES staff(id),
            is_active BOOLEAN DEFAULT true,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        // Create indexes
        await sql`CREATE INDEX idx_access_codes_hospital ON access_codes(hospital_id)`
        await sql`CREATE INDEX idx_access_codes_role ON access_codes(role)`
        await sql`CREATE INDEX idx_access_codes_active ON access_codes(is_active)`
        
        logger.info('AccessCodeAPI', 'Access codes table created successfully')
        
        return NextResponse.json({ 
          success: true, 
          message: 'Access codes table created successfully!' 
        })
      } catch (createError) {
        logger.error('AccessCodeAPI', 'Failed to create access_codes table', {
          error: createError,
          message: createError instanceof Error ? createError.message : 'Unknown error'
        })
        
        return NextResponse.json({
          success: false,
          error: `Table creation failed: ${createError instanceof Error ? createError.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    
      if (action === 'generate') {
        const { hospitalId, role, staffId } = body
        
        if (!role) {
          return NextResponse.json(
            { error: 'Role is required' },
            { status: 400 }
          )
        }
        
        // Use authenticated user's hospital if no hospitalId specified
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
        
        const accessCode = await accessCodeManager.generateAccessCode(
          targetHospitalId,
          role,
          staffId ? parseInt(staffId) : undefined
        )
        
        logger.info('AccessCodeAPI', 'Access code generated', {
          hospitalId: targetHospitalId,
          role,
          staffId,
          userId: authUser.userId
        })
        
        return NextResponse.json({
          success: true,
          accessCode,
          message: 'Access code generated successfully'
        })
      }
    
    if (action === 'revoke') {
      const { accessCode } = body
      
      if (!accessCode) {
        return NextResponse.json(
          { error: 'Access code required' },
          { status: 400 }
        )
      }
      
      const revoked = await accessCodeManager.revokeAccessCode(accessCode)
      
      if (revoked) {
        return NextResponse.json({
          success: true,
          message: 'Access code revoked successfully'
        })
      } else {
        return NextResponse.json(
          { error: 'Access code not found or already inactive' },
          { status: 404 }
        )
      }
    }
    
      if (action === 'bulk-generate') {
        // Generate access codes for all staff members without codes in user's hospital
        try {
          logger.info('AccessCodeAPI', 'Starting bulk access code generation', {
            hospitalId: authUser.hospitalId,
            userId: authUser.userId
          })
          
          // Get all staff members in user's hospital
          const allStaff = await sql`
            SELECT id, name, hospital_id, role 
            FROM staff 
            WHERE is_active = true 
            AND hospital_id = ${authUser.hospitalId}
          `
          
          // Check which staff already have access codes
          const existingCodes = await sql`
            SELECT DISTINCT staff_id 
            FROM access_codes 
            WHERE staff_id IS NOT NULL 
            AND is_active = true
            AND hospital_id = ${authUser.hospitalId}
          `
          
          const existingStaffIds = new Set(existingCodes.map(c => c.staff_id))
          const staffNeedingCodes = allStaff.filter(staff => !existingStaffIds.has(staff.id))
          
          logger.info('AccessCodeAPI', `Found ${staffNeedingCodes.length} staff members needing access codes`, {
            hospitalId: authUser.hospitalId,
            userId: authUser.userId
          })
          
          const generatedCodes = []
          
          for (const staff of staffNeedingCodes) {
            try {
              const accessCode = await accessCodeManager.generateAccessCode(
                authUser.hospitalId,
                'staff', // All are staff role
                staff.id
              )
              
              generatedCodes.push({
                staffId: staff.id,
                staffName: staff.name,
                accessCode: accessCode,
                hospitalId: authUser.hospitalId
              })
              
              logger.info('AccessCodeAPI', `Generated code for ${staff.name}`, {
                staffId: staff.id,
                hospitalId: authUser.hospitalId,
                userId: authUser.userId
              })
            } catch (error) {
              logger.error('AccessCodeAPI', `Failed to generate code for staff ${staff.id}`, error)
            }
          }
          
          return NextResponse.json({
            success: true,
            message: `Generated ${generatedCodes.length} access codes`,
            codes: generatedCodes
          })
          
        } catch (error) {
          logger.error('AccessCodeAPI', 'Bulk generation failed', { 
            error,
            userId: authUser.userId,
            hospitalId: authUser.hospitalId
          })
          return NextResponse.json({
            success: false,
            error: 'Failed to bulk generate access codes'
          }, { status: 500 })
        }
      }
    
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
      
    } catch (error) {
      logger.error('AccessCodeAPI', 'Access code operation failed', { 
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