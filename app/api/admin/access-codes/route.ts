import { NextRequest, NextResponse } from 'next/server'
import { accessCodeManager } from '@/lib/accessCodes'
import { logger } from '@/lib/logger'
import { sql } from '@/lib/db'
import { migrationRunner, migrations } from '@/lib/migrations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hospitalId = searchParams.get('hospitalId')
    
    if (!hospitalId) {
      return NextResponse.json(
        { error: 'Hospital ID required' },
        { status: 400 }
      )
    }
    
    const codes = await accessCodeManager.listHospitalCodes(parseInt(hospitalId))
    
    return NextResponse.json({ success: true, codes })
  } catch (error) {
    logger.error('AccessCodeAPI', 'Failed to list access codes', error)
    return NextResponse.json(
      { error: 'Failed to fetch access codes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'migrate') {
      // Run database migrations first
      logger.info('AccessCodeAPI', 'Running database migrations...')
      await migrationRunner.runMigrations(migrations)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Database migrations completed successfully' 
      })
    }
    
    if (action === 'generate') {
      const { hospitalId, role, staffId, expiresInDays = 30 } = body
      
      if (!hospitalId || !role) {
        return NextResponse.json(
          { error: 'Hospital ID and role are required' },
          { status: 400 }
        )
      }
      
      const accessCode = await accessCodeManager.generateAccessCode(
        parseInt(hospitalId),
        role,
        staffId ? parseInt(staffId) : undefined,
        expiresInDays
      )
      
      logger.info('AccessCodeAPI', 'Access code generated', {
        hospitalId,
        role,
        staffId
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
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    logger.error('AccessCodeAPI', 'Access code operation failed', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}