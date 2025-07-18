import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { ensureArray } from '@/lib/db-helpers'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json()

    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      )
    }

    // Check if it's a staff access code (individual 3-character codes)
    const staffResult = await sql`
      SELECT s.id, s.name, s.email, s.role, s.specialization, s.hospital_id, h.name as hospital_name
      FROM staff s
      JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.access_code = ${accessCode} 
        AND s.is_active = true
      LIMIT 1
    `
    
    const staffMembers = ensureArray(staffResult)

    if (staffMembers.length > 0) {
      // Valid individual staff access code
      const staffMember = staffMembers[0]
      
      const token = generateToken({
        id: staffMember.id,
        email: staffMember.email,
        role: staffMember.role,
        hospitalId: staffMember.hospital_id,
        hospitalName: staffMember.hospital_name,
        name: staffMember.name
      })

      // Log successful staff login
      logger.info('StaffAuth', 'Staff login successful', {
        staffId: staffMember.id,
        staffName: staffMember.name,
        hospitalId: staffMember.hospital_id,
        hospitalName: staffMember.hospital_name,
        role: staffMember.role,
        accessCode: accessCode
      })

      const response = NextResponse.json({
        success: true,
        user: {
          id: staffMember.id,
          userId: staffMember.id,
          name: staffMember.name,
          email: staffMember.email,
          role: staffMember.role,
          hospital_id: staffMember.hospital_id,
          hospitalId: staffMember.hospital_id,
          hospitalName: staffMember.hospital_name,
          specialization: staffMember.specialization
        }
      })

      // Set token as httpOnly cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })

      return response
    }

    // Invalid access code
    logger.warn('AccessCodeAuth', 'Invalid access code attempt', { accessCode })
    
    return NextResponse.json(
      { success: false, error: 'Invalid access code' },
      { status: 401 }
    )

  } catch (error) {
    logger.error('AccessCodeAuth', 'Login failed', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}