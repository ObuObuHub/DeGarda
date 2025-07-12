import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// POST to generate/save multiple shifts at once
export async function POST(request: NextRequest) {
  try {
    const { shifts, hospitalId } = await request.json()

    if (!shifts || !Array.isArray(shifts) || !hospitalId) {
      return NextResponse.json(
        { success: false, error: 'Shifts array and hospitalId are required' },
        { status: 400 }
      )
    }

    // Start transaction
    const results = []
    const conflicts = []
    
    for (const shift of shifts) {
      const { date, doctorId, doctorName, type = '24h', department } = shift
      
      // Check for conflicts
      const existingShifts = await sql`
        SELECT * FROM shifts 
        WHERE staff_id = ${doctorId} 
          AND date = ${date}
          AND id != COALESCE(
            (SELECT id FROM shifts WHERE date = ${date} AND type = ${type} AND hospital_id = ${hospitalId}),
            0
          )
      `
      
      if (existingShifts.length > 0) {
        conflicts.push({
          date,
          doctorName,
          message: `${doctorName} are deja o gardă pe ${date}`
        })
        continue
      }
      
      // Set shift times based on type
      let startTime = '08:00'
      let endTime = '08:00'
      if (type === 'day') {
        startTime = '08:00'
        endTime = '20:00'
      } else if (type === 'night') {
        startTime = '20:00'
        endTime = '08:00'
      }

      const result = await sql`
        INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, department, status)
        VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${doctorId}, ${hospitalId}, ${department}, 'assigned')
        ON CONFLICT (date, type, hospital_id, department) 
        DO UPDATE SET 
          staff_id = ${doctorId},
          status = 'assigned'
        RETURNING *
      `
      results.push(result[0])
    }

    return NextResponse.json({ 
      success: true, 
      message: conflicts.length > 0 
        ? `Generat ${results.length} gărzi. ${conflicts.length} conflicte găsite.`
        : `Generat ${results.length} gărzi`,
      shifts: results,
      conflicts
    })
  } catch (error: any) {
    console.error('Generate shifts error:', error)
    
    // Check for database connection errors
    if (error.message?.includes('Cannot convert argument to a ByteString')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error. Please check your database configuration.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate shifts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}