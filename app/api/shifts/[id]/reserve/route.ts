import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// POST to reserve a shift
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { staffId } = await request.json()
    const { id: shiftId } = await params

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Check if shift exists and is open
    const shiftResult = await sql`
      SELECT * FROM shifts 
      WHERE id = ${shiftId} AND status = 'open'
    `

    if (shiftResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift not available for reservation' },
        { status: 400 }
      )
    }

    const shift = shiftResult[0]

    // Check reservation limit (max 3 per month)
    const startOfMonth = new Date(shift.date)
    startOfMonth.setDate(1)
    const endOfMonth = new Date(shift.date)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)
    endOfMonth.setDate(0)

    const existingReservations = await sql`
      SELECT COUNT(*) as count
      FROM shift_reservations sr
      JOIN shifts s ON sr.shift_id = s.id
      WHERE sr.staff_id = ${staffId}
        AND s.date >= ${startOfMonth.toISOString().split('T')[0]}
        AND s.date <= ${endOfMonth.toISOString().split('T')[0]}
    `

    if (existingReservations[0].count >= 3) {
      return NextResponse.json(
        { success: false, error: 'Ai atins limita de 3 rezervări pe lună' },
        { status: 400 }
      )
    }

    // Create reservation
    await sql`
      INSERT INTO shift_reservations (shift_id, staff_id)
      VALUES (${shiftId}, ${staffId})
    `

    // Update shift status to reserved
    await sql`
      UPDATE shifts
      SET status = 'reserved'
      WHERE id = ${shiftId}
    `

    return NextResponse.json({ success: true, message: 'Shift reserved successfully' })
  } catch (error: any) {
    console.error('Reserve shift error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reserve shift' },
      { status: 500 }
    )
  }
}

// DELETE to cancel a reservation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { staffId } = await request.json()
    const { id: shiftId } = await params

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Delete reservation
    await sql`
      DELETE FROM shift_reservations
      WHERE shift_id = ${shiftId} AND staff_id = ${staffId}
    `

    // Update shift status back to open
    await sql`
      UPDATE shifts
      SET status = 'open'
      WHERE id = ${shiftId}
    `

    return NextResponse.json({ success: true, message: 'Reservation cancelled' })
  } catch (error: any) {
    console.error('Cancel reservation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}