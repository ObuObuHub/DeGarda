import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { generateUniqueAccessCode } from '@/lib/accessCodes'
import { logger } from '@/lib/logger'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'
import { isValidDepartment } from '@/lib/constants'
import { 
  apiSuccess, 
  apiSuccessWithPagination, 
  apiError, 
  apiValidationError, 
  apiForbidden, 
  apiServerError,
  withApiErrorHandling 
} from '@/lib/apiResponse'

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
    return withApiErrorHandling(async () => {
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
          return apiForbidden(validation.error)
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
      
      // Return paginated response if pagination params provided
      if (searchParams.get('page') || searchParams.get('limit')) {
        return apiSuccessWithPagination(
          transformedStaff,
          {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          },
          `Retrieved ${transformedStaff.length} staff members`
        )
      }
      
      // For backward compatibility, return simple success with staff array
      return apiSuccess({ staff: transformedStaff }, `Retrieved ${transformedStaff.length} staff members`)
    }, 'staff GET')
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    return withApiErrorHandling(async () => {
      const body = await request.json()
      const { name, email, type, specialization, hospitalId, role = 'staff' } = body
      
      if (!name || !type || !hospitalId) {
        return apiValidationError('Name, type, and hospital are required', {
          name: !name ? ['Name is required'] : [],
          type: !type ? ['Type is required'] : [],
          hospitalId: !hospitalId ? ['Hospital is required'] : []
        })
      }

      // Validate department if provided
      if (specialization && !isValidDepartment(specialization)) {
        return apiValidationError('Invalid department. Must be one of: Laborator, Urgențe, Chirurgie, Medicină Internă, ATI')
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
        return apiForbidden(validation.error)
      }
      
      const targetHospitalId = validation.hospitalId!
    
      // Check if email already exists (only if email is provided)
      if (email) {
        const existing = await sql`
          SELECT id FROM staff WHERE email = ${email}
        `
        
        if (existing.length > 0) {
          return apiValidationError('Email already exists')
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
      
      const createdStaff = {
        id: staff.id.toString(),
        name: staff.name,
        email: staff.email,
        type,
        specialization: staff.specialization || '',
        hospitalId: staff.hospital_id.toString(),
        role: staff.role,
        accessCode: staff.access_code
      }
      
      return apiSuccess(createdStaff, `Staff member '${staff.name}' created successfully with access code ${staff.access_code}`)
    }, 'staff POST')
  })
}