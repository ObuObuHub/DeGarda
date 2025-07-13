import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || '2025'
    const month = searchParams.get('month') || '7' // July
    const department = searchParams.get('department') || 'Urgențe'
    const hospitalId = searchParams.get('hospitalId') || '6'
    
    // Calculate date range for the month (month param is already 1-indexed from URL)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    
    // Get all shifts for this department and month
    const shifts = await sql`
      SELECT 
        id, date, type, staff_id, hospital_id, department, status,
        TO_CHAR(date, 'YYYY-MM-DD') as date_formatted
      FROM shifts
      WHERE date >= ${startDate}
        AND date <= ${endDate}
        AND hospital_id = ${hospitalId}
        AND department = ${department}
      ORDER BY date
    `
    
    // Count shifts by status
    const statusCount = await sql`
      SELECT status, COUNT(*) as count
      FROM shifts
      WHERE date >= ${startDate}
        AND date <= ${endDate}
        AND hospital_id = ${hospitalId}
        AND department = ${department}
      GROUP BY status
    `
    
    // Get staff in this department
    const departmentStaff = await sql`
      SELECT id, name, specialization
      FROM staff
      WHERE hospital_id = ${hospitalId}
        AND specialization = ${department}
        AND is_active = true
    `
    
    return NextResponse.json({
      query: {
        year,
        month: parseInt(month), // Display month as-is
        department,
        hospitalId,
        dateRange: { startDate, endDate }
      },
      shiftsFound: shifts.length,
      shifts: shifts.slice(0, 10), // First 10 shifts
      statusCount,
      departmentStaff,
      message: `Found ${shifts.length} shifts for ${department} in month ${parseInt(month) + 1}/${year}`
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}