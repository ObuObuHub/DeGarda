import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Try a simple query to test the connection
    const result = await sql`SELECT NOW() as current_time`
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result[0].current_time
    })
  } catch (error: any) {
    console.error('Database connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        severity: error.severity,
        hint: error.hint
      }
    }, { status: 500 })
  }
}