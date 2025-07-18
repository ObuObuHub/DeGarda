import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    logger.info('Admin', 'Access codes view requested')
    
    // Get all staff with their access codes
    const staff = await sql`
      SELECT 
        s.name,
        s.email,
        s.access_code,
        s.role,
        s.specialization,
        h.name as hospital_name
      FROM staff s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      ORDER BY s.role DESC, s.name ASC
    `
    
    return NextResponse.json({ 
      success: true, 
      staff
    })
  } catch (error) {
    logger.error('Admin', 'Failed to view access codes', error)
    return NextResponse.json({ 
      error: 'Failed to view access codes', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}