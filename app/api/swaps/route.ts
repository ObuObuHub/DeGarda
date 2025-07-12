import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notifySwapRequest } from '@/lib/notifications'
import { staff } from '@/lib/data'

// GET all swap requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const hospitalId = searchParams.get('hospitalId')

    // Get swap requests with staff and shift info
    const swaps = hospitalId
      ? await sql`
          SELECT 
            ss.id,
            ss.from_staff_id,
            ss.to_staff_id,
            ss.shift_id,
            ss.reason,
            ss.status,
            ss.created_at,
            s.date as shift_date,
            s.type as shift_type,
            s.hospital_id,
            sf.name as from_staff_name,
            st.name as to_staff_name,
            h.name as hospital_name
          FROM shift_swaps ss
          JOIN shifts s ON ss.shift_id = s.id
          JOIN staff sf ON ss.from_staff_id = sf.id
          LEFT JOIN staff st ON ss.to_staff_id = st.id
          JOIN hospitals h ON s.hospital_id = h.id
          WHERE ss.status = ${status}
            AND s.hospital_id = ${hospitalId}
          ORDER BY ss.created_at DESC
        `
      : await sql`
          SELECT 
            ss.id,
            ss.from_staff_id,
            ss.to_staff_id,
            ss.shift_id,
            ss.reason,
            ss.status,
            ss.created_at,
            s.date as shift_date,
            s.type as shift_type,
            s.hospital_id,
            sf.name as from_staff_name,
            st.name as to_staff_name,
            h.name as hospital_name
          FROM shift_swaps ss
          JOIN shifts s ON ss.shift_id = s.id
          JOIN staff sf ON ss.from_staff_id = sf.id
          LEFT JOIN staff st ON ss.to_staff_id = st.id
          JOIN hospitals h ON s.hospital_id = h.id
          WHERE ss.status = ${status}
          ORDER BY ss.created_at DESC
        `

    return NextResponse.json({ success: true, swaps })
  } catch (error) {
    console.error('Get swaps error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch swap requests' },
      { status: 500 }
    )
  }
}

// POST create a new swap request
export async function POST(request: NextRequest) {
  try {
    const { fromStaffId, toStaffId, shiftId, reason } = await request.json()

    if (!fromStaffId || !shiftId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create swap request
    const result = await sql`
      INSERT INTO shift_swaps (from_staff_id, to_staff_id, shift_id, reason)
      VALUES (${fromStaffId}, ${toStaffId}, ${shiftId}, ${reason})
      RETURNING *
    `

    // Get shift details for notification
    const shiftInfo = await sql`
      SELECT date FROM shifts WHERE id = ${shiftId}
    `
    
    if (toStaffId && shiftInfo.length > 0) {
      // Notify specific staff member
      const fromStaff = staff.find(s => s.id === fromStaffId)
      if (fromStaff) {
        await notifySwapRequest(toStaffId, fromStaff.name, shiftInfo[0].date)
      }
    } else {
      // Notify all managers about open swap request
      const managers = staff.filter(s => s.role === 'manager')
      const fromStaff = staff.find(s => s.id === fromStaffId)
      if (fromStaff) {
        for (const manager of managers) {
          await notifySwapRequest(manager.id, fromStaff.name, shiftInfo[0].date)
        }
      }
    }

    return NextResponse.json({ success: true, swap: result[0] })
  } catch (error) {
    console.error('Create swap error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create swap request' },
      { status: 500 }
    )
  }
}