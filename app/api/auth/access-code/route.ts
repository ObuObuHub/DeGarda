import { NextRequest, NextResponse } from 'next/server'
import { accessCodeManager } from '@/lib/accessCodes'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json()
    
    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: 'Cod de acces necesar' },
        { status: 400 }
      )
    }
    
    logger.apiRequest('POST', '/api/auth/access-code', { codeLength: accessCode.length })
    
    // Authenticate with access code
    const authResult = await accessCodeManager.authenticateWithCode(accessCode)
    
    if (!authResult.success || !authResult.user) {
      logger.warn('Auth', 'Access code authentication failed', { 
        error: authResult.error,
        codePrefix: accessCode.substring(0, 4) + '***'
      })
      
      return NextResponse.json(
        { success: false, error: authResult.error || 'Cod de acces invalid' },
        { status: 401 }
      )
    }
    
    const user = authResult.user
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospitalName
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })
    
    logger.info('Auth', 'Access code authentication successful', {
      userId: user.id,
      role: user.role,
      hospitalId: user.hospitalId
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        hospitalName: user.hospitalName,
        specialization: user.specialization
      }
    })
    
  } catch (error) {
    logger.error('Auth', 'Access code authentication error', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Eroare la autentificare' 
      },
      { status: 500 }
    )
  }
}