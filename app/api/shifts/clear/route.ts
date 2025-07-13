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
    // Frontend sends 0-indexed months (0-11), but SQL needs 1-indexed (1-12)
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const sqlMonth = monthNum + 1;
    
    const startDate = `${year}-${String(sqlMonth).padStart(2, '0')}-01`
    
    // Calculate proper last day of month
    const lastDayDate = new Date(yearNum, monthNum + 1, 0);
    const lastDay = lastDayDate.getDate();
    const endDate = `${year}-${String(sqlMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Log the deletion range for safety
    console.log(`Deleting shifts for hospital ${hospitalId} from ${startDate} to ${endDate}`)
    
    // Delete all shifts for the month
    const result = await sql`
      DELETE FROM shifts 
      WHERE date >= ${startDate} 
        AND date <= ${endDate}
        AND hospital_id = ${hospitalId}
      RETURNING id
    `

    return NextResponse.json({ 
      success: true,
      message: `${result.length} shifts deleted for the month`,
      deletedCount: result.length
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