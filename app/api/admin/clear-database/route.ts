import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Verify user is admin
async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin'
  } catch {
    return false
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authorization
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 401 }
      )
    }

    // Clear database in correct order
    await sql`DELETE FROM notifications`
    await sql`DELETE FROM staff_unavailability`
    await sql`DELETE FROM shift_swaps`
    await sql`DELETE FROM shift_reservations`
    await sql`DELETE FROM shifts`
    await sql`DELETE FROM staff`
    await sql`DELETE FROM hospitals`

    // Reset sequences
    await sql`ALTER SEQUENCE hospitals_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE staff_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE shifts_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE shift_reservations_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE shift_swaps_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE staff_unavailability_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`

    return NextResponse.json({ 
      success: true,
      message: 'Database cleared successfully. You can now add hospitals and staff.'
    })
  } catch (error: any) {
    console.error('Clear database error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear database',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}