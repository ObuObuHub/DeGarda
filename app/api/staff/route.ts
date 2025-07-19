import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { generateUniqueAccessCode } from '@/lib/accessCodes'
import { logger } from '@/lib/logger'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'

// Verify user is admin or manager
async function verifyAdminOrManager(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin' || decoded.role === 'manager'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const hospitalIdParam = searchParams.get('hospitalId')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = (page - 1) * limit
      
      // Use authenticated user's hospital if no hospitalId specified
      let targetHospitalId = authUser.hospitalId
      
      if (hospitalIdParam) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam, authUser.role)
        if (!validation.valid) {
          logger.warn('StaffAPI', 'Hospital access denied', {
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
      
      // Get total count for pagination
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM staff
        WHERE is_active = true AND hospital_id = ${targetHospitalId}
      `
      
      const countResult = await countQuery
      const totalCount = parseInt(countResult[0].total)
      
      // Get paginated results
      const query = sql`
        SELECT id, name, email, role, hospital_id, specialization, is_active, created_at
        FROM staff
        WHERE is_active = true AND hospital_id = ${targetHospitalId}
        ORDER BY name
        LIMIT ${limit}
        OFFSET ${offset}
      `
      
      const staffMembers = await query
    
      // Transform data to match frontend expectations
      const transformedStaff = staffMembers.map(member => {
        // Determine type based on name prefix or specialization
        let type: 'medic' | 'biolog' | 'chimist' | 'asistent' = 'medic'
        
        if (member.name.includes('Dr.')) {
          type = 'medic'
        } else if (member.name.includes('Biol.')) {
          type = 'biolog'
        } else if (member.name.includes('Ch.')) {
          type = 'chimist'
        } else if (member.name.includes('As.')) {
          type = 'asistent'
        } else if (member.specialization?.toLowerCase().includes('biolog')) {
          type = 'biolog'
        } else if (member.specialization?.toLowerCase().includes('chimist')) {
          type = 'chimist'
        } else if (member.specialization?.toLowerCase().includes('asistent')) {
          type = 'asistent'
        }
        
        return {
          id: member.id.toString(),
          name: member.name,
          email: member.email,
          type,
          specialization: member.specialization || '',
          hospitalId: member.hospital_id?.toString() || '',
          role: member.role
        }
      })
      
      // For backward compatibility, return just the array if no pagination params
      if (!searchParams.get('page') && !searchParams.get('limit')) {
        return NextResponse.json(transformedStaff)
      }
      
      // Return paginated response
      return NextResponse.json({
        data: transformedStaff,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    } catch (error) {
      logger.error('StaffAPI', 'Error fetching staff', { error, userId: authUser.userId })
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      const { name, email, type, specialization, hospitalId, role = 'staff' } = body
      
      if (!name || !type || !hospitalId) {
        return NextResponse.json(
          { error: 'Name, type, and hospital are required' },
          { status: 400 }
        )
      }
      
      // Validate hospital access
      const validation = validateHospitalParam(authUser.hospitalId, hospitalId, authUser.role)
      if (!validation.valid) {
        logger.warn('StaffAPI', 'Hospital access denied for staff creation', {
          userId: authUser.userId,
          userHospital: authUser.hospitalId,
          requestedHospital: hospitalId,
          error: validation.error
        })
        return NextResponse.json(
          { error: validation.error },
          { status: 403 }
        )
      }
      
      const targetHospitalId = validation.hospitalId!
    
      // Check if email already exists (only if email is provided)
      if (email) {
        const existing = await sql`
          SELECT id FROM staff WHERE email = ${email}
        `
        
        if (existing.length > 0) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 400 }
          )
        }
      }
      
      // Generate unique 3-character access code
      const accessCode = await generateUniqueAccessCode(name)
      
      // Generate a secure temporary password (kept for legacy compatibility)
      const tempPassword = Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      const result = await sql`
        INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active, access_code)
        VALUES (${name}, ${email || null}, ${hashedPassword}, ${role}, ${targetHospitalId}, ${specialization}, true, ${accessCode})
        RETURNING id, name, email, role, hospital_id, specialization, is_active, created_at, access_code
      `
      
      const staff = result[0]
      
      logger.info('StaffAPI', 'Staff created successfully with unique access code', {
        staffId: staff.id,
        staffName: staff.name,
        accessCode: staff.access_code,
        hospitalId: targetHospitalId,
        createdBy: authUser.userId,
        createdByName: authUser.name
      })
      
      return NextResponse.json({
        id: staff.id.toString(),
        name: staff.name,
        email: staff.email,
        type,
        specialization: staff.specialization || '',
        hospitalId: staff.hospital_id.toString(),
        role: staff.role,
        accessCode: staff.access_code
      })
    } catch (error) {
      logger.error('StaffAPI', 'Error creating staff', { error, userId: authUser.userId })
      return NextResponse.json(
        { error: 'Failed to create staff member' },
        { status: 500 }
      )
    }
  })
}