import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    // Only admins can access this endpoint
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    try {
      logger.info('Admin', 'All staff data requested by admin', { adminId: authUser.userId })
      
      // Get all staff with hospital names and access codes
      const staff = await sql`
        SELECT 
          s.id,
          s.name,
          s.email,
          s.access_code,
          s.role,
          s.specialization,
          s.hospital_id,
          h.name as hospital_name,
          s.created_at
        FROM staff s
        LEFT JOIN hospitals h ON s.hospital_id = h.id
        WHERE s.is_active = true
        ORDER BY h.name, s.role DESC, s.name ASC
      `
      
      return NextResponse.json({ 
        success: true, 
        staff: staff || []
      })
    } catch (error) {
      logger.error('Admin', 'Failed to get all staff', error)
      return NextResponse.json({ 
        error: 'Failed to load staff data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 })
    }
  })
}