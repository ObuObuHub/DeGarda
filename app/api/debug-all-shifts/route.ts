import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get shifts grouped by hospital and department for current month
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1 // 1-indexed for SQL
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    
    // Count shifts by hospital and department
    const shiftCounts = await sql`
      SELECT 
        h.name as hospital_name,
        s.hospital_id,
        s.department,
        COUNT(*) as shift_count,
        COUNT(DISTINCT s.date) as days_covered
      FROM shifts s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.date >= ${startDate}
        AND s.date <= ${endDate}
      GROUP BY h.name, s.hospital_id, s.department
      ORDER BY s.hospital_id, s.department
    `
    
    // Get all hospitals
    const hospitals = await sql`
      SELECT id, name FROM hospitals ORDER BY id
    `
    
    // Sample shifts from July 2025
    const julySample = await sql`
      SELECT 
        s.id,
        s.date,
        s.hospital_id,
        h.name as hospital_name,
        s.department,
        s.staff_id,
        st.name as staff_name
      FROM shifts s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      LEFT JOIN staff st ON s.staff_id = st.id
      WHERE s.date >= '2025-07-01'
        AND s.date <= '2025-07-31'
      ORDER BY s.hospital_id, s.department, s.date
      LIMIT 20
    `
    
    return NextResponse.json({
      currentMonth: `${year}-${month}`,
      shiftCounts,
      hospitals,
      july2025Sample: julySample,
      message: 'Showing shift distribution across hospitals and departments'
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}