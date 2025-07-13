import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
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
        ALTER TABLE shifts 
        ADD COLUMN department VARCHAR(255)
      `
      
      // Update existing shifts to set department from staff specialization
      await sql`
        UPDATE shifts s
        SET department = st.specialization
        FROM staff st
        WHERE s.staff_id = st.id
        AND s.department IS NULL
      `
      
      // Drop old unique constraint if exists
      try {
        await sql`
          ALTER TABLE shifts 
          DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_key
        `
      } catch (e) {
        // Constraint might not exist
      }
      
      // Add new unique constraint with department
      await sql`
        ALTER TABLE shifts
        DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_department_key
      `
      
      await sql`
        ALTER TABLE shifts
        ADD CONSTRAINT shifts_date_type_hospital_id_department_key 
        UNIQUE (date, type, hospital_id, department)
      `
      
      return NextResponse.json({ 
        success: true, 
        message: 'Department column added and constraints updated' 
      })
    }
    
    // Check current constraints
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'shifts'::regclass
      AND conname LIKE '%key%'
    `
    
    return NextResponse.json({ 
      success: true, 
      message: 'Department column already exists',
      constraints 
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Failed to ensure department column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}