import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Verify user is admin or manager
async function verifyAdminOrManager() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin' || decoded.role === 'manager'
  } catch {
    return false
  }
}

// DELETE all shifts for a specific month/year and hospital
export async function DELETE(request: NextRequest) {
  try {
    // Auth disabled temporarily
    // const isAuthorized = await verifyAdminOrManager()
    // if (!isAuthorized) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const hospitalId = searchParams.get('hospitalId')

    if (!year || !month || !hospitalId) {
      return NextResponse.json(
        { success: false, error: 'Year, month, and hospitalId are required' },
        { status: 400 }
      )
    }

    // Calculate date range for the month
    const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-31`

    // Clear all shift assignments for the month
    await sql`
      UPDATE shifts 
      SET staff_id = NULL, status = 'open'
      WHERE date >= ${startDate} 
        AND date <= ${endDate}
        AND hospital_id = ${hospitalId}
    `

    return NextResponse.json({ 
      success: true,
      message: 'All shifts cleared for the month'
    })
  } catch (error: any) {
    console.error('Clear shifts error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear shifts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}