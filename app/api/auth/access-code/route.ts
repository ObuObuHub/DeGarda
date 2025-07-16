import { NextRequest, NextResponse } from 'next/server'
import { staffPasswordManager } from '@/lib/staffPasswordManager'
import { logger } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// Input validation functions
function validateStaffPassword(password: unknown): password is string {
  return typeof password === 'string' && 
         password.length >= 3 && 
         password.length <= 10 &&
         /^[a-zA-Z0-9]+$/.test(password)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode } = body // Keep accessCode name for backward compatibility
    
    if (!validateStaffPassword(accessCode)) {
      return NextResponse.json(
        { success: false, error: 'Parolă invalidă - doar litere și cifre, 3-10 caractere' },
        { status: 400 }
      )
    }
    
    logger.apiRequest('POST', '/api/auth/access-code', { passwordLength: accessCode.length })
    
    // Authenticate with staff password
    const authResult = await staffPasswordManager.authenticateWithPassword(accessCode)
    
    if (!authResult.success || !authResult.user) {
      logger.warn('Auth', 'Staff password authentication failed', { 
        error: authResult.error,
        passwordPrefix: accessCode.substring(0, 2) + '***'
      })
      
      return NextResponse.json(
        { success: false, error: authResult.error || 'Parolă invalidă' },
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
    
    logger.info('Auth', 'Staff password authentication successful', {
      userId: user.id,
      userName: user.name,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalName: user.hospitalName
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
    logger.error('Auth', 'Staff password authentication error', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Eroare la autentificare' 
      },
      { status: 500 }
    )
  }
}