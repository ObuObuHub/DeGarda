import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { comparePassword, generateToken } from '@/lib/auth'
import { ensureArray } from '@/lib/db-helpers'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, password, hospitalId } = await request.json()

    if (!email || !password || !hospitalId) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and hospital are required' },
        { status: 400 }
      )
    }

    // Find user by email AND hospital
    const result = await sql`
      SELECT id, name, email, password, role, hospital_id, specialization, is_active
      FROM staff
      WHERE email = ${email} AND hospital_id = ${hospitalId}
      LIMIT 1
    `
    
    const users = ensureArray(result)

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is disabled' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospital_id
    })

    // Note: This legacy login endpoint should redirect to unified dashboard
    // All new authentication should use /api/auth/access-code
    
    // Log successful login  
    logger.info('AuthLogin', 'User login successful', { userId: user.id, email: user.email, role: user.role })

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user

    const response = NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token
    })

    // Set token as httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}