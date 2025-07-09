import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const result = await sql`SELECT NOW()`
    return NextResponse.json({ 
      success: true, 
      time: result[0].now,
      message: 'Database connection successful' 
    })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Database connection failed',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}