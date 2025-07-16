import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get token from HTTP-only cookie
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('auth-token')
    
    if (!tokenCookie) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }
    
    const token = tokenCookie.value
    
    if (!process.env.JWT_SECRET) {
      logger.error('Auth', 'JWT_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
    
    // Return user information
    return NextResponse.json({
      success: true,
      user: {
        userId: decoded.userId,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        hospitalId: decoded.hospitalId,
        hospitalName: decoded.hospitalName
      },
      // Include individual fields for backward compatibility
      userId: decoded.userId,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      hospitalId: decoded.hospitalId,
      hospitalName: decoded.hospitalName
    })
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Auth', 'Invalid token provided', { error: error.message })
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Auth', 'Expired token provided', { error: error.message })
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      )
    }
    
    logger.error('Auth', 'Token verification failed', error)
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    )
  }
}

// POST method removed - using HTTP-only cookies with GET only