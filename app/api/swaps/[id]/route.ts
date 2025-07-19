import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

// PATCH to approve/reject a swap - REQUIRES MANAGER OR ADMIN ROLE
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { status, reviewComment } = await request.json()
      const { id: swapId } = await params

      // Only managers and admins can approve/reject swaps
      if (!['manager', 'admin'].includes(authUser.role)) {
        logger.warn('SwapApproval', 'Unauthorized approval attempt', {
          userId: authUser.userId,
          role: authUser.role,
          swapId
        })
        return NextResponse.json(
          { success: false, error: 'Manager or admin access required' },
          { status: 403 }
        )
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        )
      }

      // Get swap details with hospital isolation
      const swapResult = await sql`
        SELECT ss.*, s.date, s.type, s.hospital_id
        FROM shift_swaps ss
        JOIN shifts s ON ss.shift_id = s.id
        WHERE ss.id = ${swapId} AND s.hospital_id = ${authUser.hospitalId}
      `

      if (swapResult.length === 0) {
        logger.warn('SwapApproval', 'Swap not found or access denied', {
          userId: authUser.userId,
          hospitalId: authUser.hospitalId,
          swapId
        })
        return NextResponse.json(
          { success: false, error: 'Swap request not found or access denied' },
          { status: 404 }
        )
      }

      const swap = swapResult[0]

      // If approved, update the shift assignment
      if (status === 'approved' && swap.to_staff_id) {
        // Verify the target staff member belongs to same hospital
        const staffCheck = await sql`
          SELECT id FROM staff 
          WHERE id = ${swap.to_staff_id} AND hospital_id = ${authUser.hospitalId}
        `
        
        if (staffCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Invalid staff assignment' },
            { status: 400 }
          )
        }

        // Update shift to new staff member
        await sql`
          UPDATE shifts 
          SET staff_id = ${swap.to_staff_id}
          WHERE id = ${swap.shift_id} AND hospital_id = ${authUser.hospitalId}
        `
      }

      // Update swap request status
      await sql`
        UPDATE shift_swaps
        SET 
          status = ${status},
          reviewed_by = ${authUser.userId},
          reviewed_at = CURRENT_TIMESTAMP,
          review_comment = ${reviewComment || null}
        WHERE id = ${swapId}
      `

      logger.info('SwapApproval', `Swap ${status}`, {
        swapId,
        reviewedBy: authUser.userId,
        reviewerName: authUser.name,
        hospitalId: authUser.hospitalId,
        status
      })

      return NextResponse.json({ 
        success: true, 
        message: `Swap ${status} by ${authUser.name}` 
      })
    } catch (error: any) {
      logger.error('SwapApproval', 'Failed to update swap request', error, {
        userId: authUser.userId,
        hospitalId: authUser.hospitalId
      })
      return NextResponse.json(
        { success: false, error: 'Failed to update swap request' },
        { status: 500 }
      )
    }
  })
}