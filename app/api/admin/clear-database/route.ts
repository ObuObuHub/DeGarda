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
    // Auth disabled temporarily
    // const isAdmin = await verifyAdmin()
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized - Admin only' },
    //     { status: 401 }
    //   )
    // }

    // Clear database in correct order - only delete from tables that exist
    try {
      await sql`DELETE FROM notifications`
    } catch (e) {
      console.log('Notifications table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM staff_unavailability`
    } catch (e) {
      console.log('Staff unavailability table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM shift_swaps`
    } catch (e) {
      console.log('Shift swaps table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM shift_reservations`
    } catch (e) {
      console.log('Shift reservations table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM shifts`
    } catch (e) {
      console.log('Shifts table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM staff`
    } catch (e) {
      console.log('Staff table does not exist, skipping...')
    }

    try {
      await sql`DELETE FROM hospitals`
    } catch (e) {
      console.log('Hospitals table does not exist, skipping...')
    }

    // Reset sequences - only if they exist
    const sequences = [
      'hospitals_id_seq',
      'staff_id_seq',
      'shifts_id_seq',
      'shift_reservations_id_seq',
      'shift_swaps_id_seq',
      'staff_unavailability_id_seq',
      'notifications_id_seq'
    ]

    for (const seq of sequences) {
      try {
        await sql`ALTER SEQUENCE ${sql.raw(seq)} RESTART WITH 1`
      } catch (e) {
        console.log(`Sequence ${seq} does not exist, skipping...`)
      }
    }

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