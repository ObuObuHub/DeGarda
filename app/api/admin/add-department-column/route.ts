import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Check if department column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      AND column_name = 'department'
    `
    
    if (columnCheck.length === 0) {
      // Add department column
      await sql`
        ALTER TABLE shifts ADD COLUMN department VARCHAR(100)
      `
      
      // Drop old constraint
      await sql`
        ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_key
      `
      
      // Add new constraint including department
      await sql`
        ALTER TABLE shifts ADD CONSTRAINT shifts_date_type_hospital_id_department_key 
        UNIQUE(date, type, hospital_id, department)
      `
      
      // Update existing shifts with department based on staff's specialization
      await sql`
        UPDATE shifts s
        SET department = st.specialization
        FROM staff st
        WHERE s.staff_id = st.id
        AND s.department IS NULL
      `
      
      return NextResponse.json({ 
        success: true, 
        message: 'Department column added and existing shifts updated' 
      })
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Department column already exists' 
      })
    }
  } catch (error: any) {
    console.error('Add department column error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to add department column'
      },
      { status: 500 }
    )
  }
}