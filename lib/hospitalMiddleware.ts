/**
 * Hospital Isolation Middleware for DeGarda
 * Ensures users can only access data from their own hospital
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, TokenPayload } from './auth'
import { logger } from './logger'

export interface AuthUser {
  userId: number
  name: string
  email: string
  role: string
  hospitalId: number
  hospitalName: string
}

export interface HospitalAuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Verify JWT token and extract hospital information
 */
export async function verifyHospitalAuth(request: NextRequest): Promise<HospitalAuthResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }
    
    const decoded = verifyToken(token.value)
    
    if (!decoded) {
      return { success: false, error: 'Invalid authentication token' }
    }
    
    if (!decoded.hospitalId) {
      return { success: false, error: 'No hospital ID in token' }
    }
    
    return {
      success: true,
      user: {
        userId: decoded.id,
        name: decoded.name || decoded.email, // Use name if available, otherwise email
        email: decoded.email,
        role: decoded.role,
        hospitalId: decoded.hospitalId,
        hospitalName: decoded.hospitalName
      }
    }
  } catch (error) {
    logger.error('HospitalAuth', 'Token verification failed', error)
    return { success: false, error: 'Invalid token' }
  }
}

/**
 * Check if user has permission to access hospital data
 */
export function checkHospitalAccess(userHospitalId: number, targetHospitalId: number, userRole?: string): boolean {
  // Admins can access all hospitals
  if (userRole === 'admin') {
    return true
  }
  
  return userHospitalId === targetHospitalId
}

/**
 * Middleware function to ensure hospital isolation
 */
export async function withHospitalAuth(
  request: NextRequest,
  handler: (authUser: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const authResult = await verifyHospitalAuth(request)
  
  if (!authResult.success || !authResult.user) {
    logger.warn('HospitalAuth', 'Unauthorized access attempt', {
      url: request.url,
      error: authResult.error
    })
    
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  logger.info('HospitalAuth', 'Authorized request', {
    userId: authResult.user.userId,
    hospitalId: authResult.user.hospitalId,
    role: authResult.user.role,
    url: request.url
  })
  
  return handler(authResult.user)
}

/**
 * Validate hospital ID parameter against user's hospital
 */
export function validateHospitalParam(
  userHospitalId: number,
  paramValue: string | null,
  userRole?: string,
  paramName: string = 'hospitalId'
): { valid: boolean, hospitalId?: number, error?: string } {
  if (!paramValue) {
    return { valid: false, error: `${paramName} parameter required` }
  }
  
  const targetHospitalId = parseInt(paramValue)
  
  if (isNaN(targetHospitalId)) {
    return { valid: false, error: `Invalid ${paramName} parameter` }
  }
  
  if (!checkHospitalAccess(userHospitalId, targetHospitalId, userRole)) {
    return { valid: false, error: `Access denied to hospital ${targetHospitalId}` }
  }
  
  return { valid: true, hospitalId: targetHospitalId }
}

/**
 * SQL query helper that automatically adds hospital isolation
 */
export function hospitalQuery(baseQuery: string, hospitalId: number): string {
  // Add hospital_id filter if not already present
  const lowerQuery = baseQuery.toLowerCase()
  
  if (lowerQuery.includes('where')) {
    return baseQuery + ` AND hospital_id = ${hospitalId}`
  } else {
    return baseQuery + ` WHERE hospital_id = ${hospitalId}`
  }
}