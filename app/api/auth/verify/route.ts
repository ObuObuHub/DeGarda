import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }
    
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