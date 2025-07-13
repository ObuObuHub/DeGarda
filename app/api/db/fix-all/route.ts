import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const fixes = []
  
  try {
    // 1. Check and add department column if missing
    const deptColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      AND column_name = 'department'
    `
    
    if (deptColumn.length === 0) {
      await sql`ALTER TABLE shifts ADD COLUMN department VARCHAR(255)`
      fixes.push('Added department column')
    }
    
    // 2. Update shifts without departments
    const updated = await sql`
      UPDATE shifts s
      SET department = COALESCE(st.specialization, 'Medicină Internă')
      FROM staff st
      WHERE s.staff_id = st.id
      AND s.department IS NULL
      RETURNING s.id
    `
    if (updated.length > 0) {
      fixes.push(`Updated ${updated.length} shifts with department`)
    }
    
    // 3. Fix constraints
    try {
      // Drop old constraints
      await sql`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_key`
      await sql`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_hospital_id_key`
      
      // Check if new constraint exists
      const constraintExists = await sql`
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'shifts_date_type_hospital_id_department_key'
      `
      
      if (constraintExists.length === 0) {
        // Add new constraint
        await sql`
          ALTER TABLE shifts
          ADD CONSTRAINT shifts_date_type_hospital_id_department_key 
          UNIQUE (date, type, hospital_id, department)
        `
        fixes.push('Added unique constraint with department')
      }
    } catch (e: any) {
      fixes.push(`Constraint update: ${e.message}`)
    }
    
    // 4. Get current state
    const sampleShifts = await sql`
      SELECT id, date, hospital_id, department, staff_id
      FROM shifts
      WHERE date >= CURRENT_DATE
      ORDER BY date
      LIMIT 10
    `
    
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'shifts'::regclass
    `
    
    return NextResponse.json({ 
      success: true,
      fixes,
      sampleShifts,
      constraints,
      message: fixes.length > 0 ? 'Database fixed!' : 'Database already correct'
    })
    
  } catch (error) {
    console.error('Fix database error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix database',
      details: error instanceof Error ? error.message : 'Unknown error',
      fixes
    }, { status: 500 })
  }
}