import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'
import { apiSuccess, apiError, apiForbidden, withApiErrorHandling } from '@/lib/apiResponse'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      let hospitals
      
      // Admins can see all hospitals, others only their own
      if (authUser.role === 'admin') {
        hospitals = await sql`
          SELECT id, name, city, created_at
          FROM hospitals
          ORDER BY name ASC
        `
      } else {
        hospitals = await sql`
          SELECT id, name, city, created_at
          FROM hospitals
          WHERE id = ${authUser.hospitalId}
          ORDER BY name ASC
        `
      }
      
      // Add staff count and departments count for each hospital
      const hospitalsWithStats = await Promise.all(
        hospitals.map(async (hospital) => {
          // Only show stats for hospitals the user can access
          if (authUser.role !== 'admin' && hospital.id !== authUser.hospitalId) {
            return {
              ...hospital,
              id: hospital.id.toString(),
              staff: 0,
              departments: 0
            }
          }
          
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
      
      logger.info('HospitalsAPI', 'Hospitals fetched', {
        userId: authUser.userId,
        role: authUser.role,
        hospitalId: authUser.hospitalId,
        count: hospitalsWithStats.length
      })
      
      return apiSuccess(hospitalsWithStats, 'Hospitals retrieved successfully')
    } catch (error) {
      logger.error('HospitalsAPI', 'Error fetching hospitals', error, {
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return apiError('Failed to fetch hospitals', 500)
    }
  })
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    // Only admins can create hospitals
    if (authUser.role !== 'admin') {
      logger.warn('HospitalsAPI', 'Unauthorized hospital creation attempt', {
        userId: authUser.userId,
        role: authUser.role
      })
      return apiForbidden('Admin access required')
    }
    
    try {
      const body = await request.json()
      const { name, city } = body
      
      if (!name) {
        return apiError('Name is required', 400)
      }
      
      const result = await sql`
        INSERT INTO hospitals (name, city)
        VALUES (${name}, ${city || ''})
        RETURNING id, name, city, created_at
      `
      
      const hospital = result[0]
      
      logger.info('HospitalsAPI', 'Hospital created', {
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        createdBy: authUser.userId,
        createdByName: authUser.name
      })
      
      const responseData = {
        ...hospital,
        id: hospital.id.toString(),
        staff: 0
      }
      
      return apiSuccess(responseData, 'Hospital created successfully')
    } catch (error) {
      logger.error('HospitalsAPI', 'Error creating hospital', error, {
        userId: authUser.userId
      })
      return apiError('Failed to create hospital', 500)
    }
  })
}