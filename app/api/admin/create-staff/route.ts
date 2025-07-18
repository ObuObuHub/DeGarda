import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      // Only admin can create staff
      if (authUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admin can create staff' },
          { status: 403 }
        )
      }

      const { name, email, specialization, hospitalId, accessCode, hasManagerPrivileges } = await request.json()
      
      if (!name || !specialization || !hospitalId || !accessCode) {
        return NextResponse.json(
          { error: 'Name, specialization, hospitalId, and accessCode are required' },
          { status: 400 }
        )
      }

      // Validate access code is exactly 3 characters
      if (accessCode.length !== 3) {
        return NextResponse.json(
          { error: 'Access code must be exactly 3 characters' },
          { status: 400 }
        )
      }

      // Check if access code already exists
      const existingCode = await sql`
        SELECT id FROM staff WHERE access_code = ${accessCode}
      `
      
      if (existingCode.length > 0) {
        return NextResponse.json(
          { error: 'Access code already exists' },
          { status: 400 }
        )
      }

      // Check if email already exists (only if email is provided)
      if (email) {
        const existingEmail = await sql`
          SELECT id FROM staff WHERE email = ${email}
        `
        
        if (existingEmail.length > 0) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 400 }
          )
        }
      }

      // Check if hospital exists
      const hospital = await sql`
        SELECT id FROM hospitals WHERE id = ${hospitalId}
      `
      
      if (hospital.length === 0) {
        return NextResponse.json(
          { error: 'Hospital not found' },
          { status: 404 }
        )
      }

      // Generate a temporary password (user will login with access code)
      const tempPassword = Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      // Determine role based on manager privileges
      const role = hasManagerPrivileges ? 'manager' : 'staff'
      
      // Create the staff member
      const result = await sql`
        INSERT INTO staff (name, email, password, role, hospital_id, specialization, access_code, is_active)
        VALUES (${name}, ${email || null}, ${hashedPassword}, ${role}, ${hospitalId}, ${specialization}, ${accessCode}, true)
        RETURNING id, name, email, role, hospital_id, specialization, access_code, is_active, created_at
      `
      
      const staff = result[0]
      
      logger.info('AdminAPI', 'Staff created successfully', {
        staffId: staff.id,
        staffName: staff.name,
        hospitalId: staff.hospital_id,
        role: staff.role,
        accessCode: staff.access_code,
        createdBy: authUser.userId
      })

      return NextResponse.json({
        success: true,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          specialization: staff.specialization,
          hospitalId: staff.hospital_id,
          accessCode: staff.access_code
        }
      })

    } catch (error) {
      logger.error('AdminAPI', 'Failed to create staff', { error, userId: authUser.userId })
      return NextResponse.json(
        { error: 'Failed to create staff member' },
        { status: 500 }
      )
    }
  })
}