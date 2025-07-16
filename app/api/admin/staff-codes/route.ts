import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'

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
    
    logger.info('StaffCodesAPI', 'Fetching staff with access codes', { hospitalId })
    
    // Get staff with their access codes
    const staffWithCodes = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.role,
        s.specialization,
        s.hospital_id,
        ac.code_hash,
        ac.is_active as code_active,
        ac.created_at as code_created
      FROM staff s
      LEFT JOIN access_codes ac ON s.id = ac.staff_id AND ac.is_active = true
      WHERE s.hospital_id = ${parseInt(hospitalId)} 
      AND s.is_active = true
      ORDER BY s.name
    `
    
    // Transform data for display
    const staffList = staffWithCodes.map(staff => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      specialization: staff.specialization,
      hospitalId: staff.hospital_id,
      hasAccessCode: !!staff.code_hash,
      codeCreated: staff.code_created ? new Date(staff.code_created).toLocaleDateString() : null
    }))
    
    const stats = {
      total: staffList.length,
      withCodes: staffList.filter(s => s.hasAccessCode).length,
      withoutCodes: staffList.filter(s => !s.hasAccessCode).length
    }
    
    logger.info('StaffCodesAPI', 'Staff codes fetched', stats)
    
    return NextResponse.json({
      success: true,
      staff: staffList,
      stats
    })
    
  } catch (error) {
    logger.error('StaffCodesAPI', 'Failed to fetch staff codes', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff codes' },
      { status: 500 }
    )
  }
}