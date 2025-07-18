import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'

// Verify user is admin or manager
async function verifyAdminOrManager(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    // Only admin and manager can modify hospitals
    return decoded.role === 'admin' || decoded.role === 'manager'
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const hospitals = await sql`
      SELECT id, name, city, created_at
      FROM hospitals
      ORDER BY name ASC
    `
    
    // Add staff count and departments count for each hospital
    const hospitalsWithStats = await Promise.all(
      hospitals.map(async (hospital) => {
        const staffCount = await sql`
          SELECT COUNT(*) as count
          FROM staff
          WHERE hospital_id = ${hospital.id}
        `
        
        // Count distinct departments for this hospital
        const departmentCount = await sql`
          SELECT COUNT(DISTINCT specialization) as count
          FROM staff
          WHERE hospital_id = ${hospital.id}
          AND specialization IS NOT NULL
          AND specialization != ''
        `
        
        return {
          ...hospital,
          id: hospital.id.toString(),
          staff: parseInt(staffCount[0].count),
          departments: parseInt(departmentCount[0].count)
        }
      })
    )
    
    return NextResponse.json(hospitalsWithStats)
  } catch (error) {
    logger.error('HospitalsAPI', 'Error fetching hospitals', error)
    return NextResponse.json(
      { error: 'Failed to fetch hospitals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Verify admin or manager authentication
  const isAuthorized = await verifyAdminOrManager(request)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin or Manager access required' },
      { status: 401 }
    )
  }
  
  try {
    const body = await request.json()
    const { name, city } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    const result = await sql`
      INSERT INTO hospitals (name, city)
      VALUES (${name}, ${city || ''})
      RETURNING id, name, city, created_at
    `
    
    const hospital = result[0]
    
    return NextResponse.json({
      ...hospital,
      id: hospital.id.toString(),
      staff: 0
    })
  } catch (error) {
    logger.error('HospitalsAPI', 'Error creating hospital', error)
    return NextResponse.json(
      { error: 'Failed to create hospital' },
      { status: 500 }
    )
  }
}