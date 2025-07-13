import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'shifts'
      ORDER BY ordinal_position
    `
    
    // Check constraints
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'shifts'::regclass
    `
    
    // Get a sample of recent shifts
    const recentShifts = await sql`
      SELECT * FROM shifts
      ORDER BY created_at DESC
      LIMIT 5
    `
    
    return NextResponse.json({
      columns,
      constraints,
      recentShifts,
      message: 'Check if department column exists and what the unique constraint includes'
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}