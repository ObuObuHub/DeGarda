import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    const newPassword = 'TempPass123!'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    await sql`
      UPDATE staff 
      SET password = ${hashedPassword}
      WHERE email = 'admin@degarda.ro'
    `
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin password reset to: TempPass123!'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}