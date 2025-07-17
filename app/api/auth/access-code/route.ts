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

    // Check if it's a hospital access code
    const hospitalResult = await sql`
      SELECT id, name, access_code
      FROM hospitals
      WHERE access_code = ${accessCode}
      LIMIT 1
    `
    
    const hospitals = ensureArray(hospitalResult)

    if (hospitals.length > 0) {
      // Valid hospital access code - create staff session
      const hospital = hospitals[0]
      
      // For hospital access codes, create a generic staff user session
      // This allows any staff member from that hospital to log in
      const token = generateToken({
        id: 'staff-' + hospital.id, // Generic staff ID for hospital
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        role: 'staff',
        name: 'Personal Medical',
        email: `staff@${hospital.name.toLowerCase().replace(/\s+/g, '')}.ro`
      })

      // Log successful hospital login
      logger.info('HospitalAuth', 'Hospital staff login successful', {
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        accessCode: accessCode
      })

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'staff-' + hospital.id,
          name: 'Personal Medical',
          email: `staff@${hospital.name.toLowerCase().replace(/\s+/g, '')}.ro`,
          role: 'staff',
          hospital_id: hospital.id,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          userId: 'staff-' + hospital.id
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

    // Check if it's a manager access code
    const managerResult = await sql`
      SELECT s.id, s.name, s.email, s.role, s.hospital_id, h.name as hospital_name
      FROM staff s
      JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.access_code = ${accessCode} 
        AND s.role IN ('manager', 'admin')
        AND s.is_active = true
      LIMIT 1
    `
    
    const managers = ensureArray(managerResult)

    if (managers.length > 0) {
      // Valid manager access code
      const manager = managers[0]
      
      const token = generateToken({
        id: manager.id,
        email: manager.email,
        role: manager.role,
        hospitalId: manager.hospital_id,
        hospitalName: manager.hospital_name,
        name: manager.name
      })

      // Log successful manager login
      logger.info('ManagerAuth', 'Manager login successful', {
        managerId: manager.id,
        managerName: manager.name,
        hospitalId: manager.hospital_id,
        role: manager.role
      })

      const response = NextResponse.json({
        success: true,
        user: {
          id: manager.id,
          userId: manager.id,
          name: manager.name,
          email: manager.email,
          role: manager.role,
          hospital_id: manager.hospital_id,
          hospitalId: manager.hospital_id,
          hospitalName: manager.hospital_name
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