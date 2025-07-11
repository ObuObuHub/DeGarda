import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// PATCH to approve/reject a swap
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status, reviewedBy, reviewComment } = await request.json()
    const { id: swapId } = await params

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get swap details
    const swapResult = await sql`
      SELECT ss.*, s.date, s.type, s.hospital_id
      FROM shift_swaps ss
      JOIN shifts s ON ss.shift_id = s.id
      WHERE ss.id = ${swapId}
    `

    if (swapResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Swap request not found' },
        { status: 404 }
      )
    }

    const swap = swapResult[0]

    // If approved, update the shift assignment
    if (status === 'approved' && swap.to_staff_id) {
      // Update shift to new staff member
      await sql`
        UPDATE shifts 
        SET staff_id = ${swap.to_staff_id}
        WHERE id = ${swap.shift_id}
      `
    }

    // Update swap request status
    await sql`
      UPDATE shift_swaps
      SET 
        status = ${status},
        reviewed_by = ${reviewedBy || null},
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ${swapId}
    `

    return NextResponse.json({ success: true, message: `Swap ${status}` })
  } catch (error: any) {
    console.error('Update swap error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update swap request' },
      { status: 500 }
    )
  }
}