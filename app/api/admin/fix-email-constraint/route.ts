import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Fix email constraint to allow NULL
    await sql`ALTER TABLE staff ALTER COLUMN email DROP NOT NULL`
    
    return NextResponse.json({ 
      success: true,
      message: 'Email constraint fixed - staff can now be added without email!'
    })
  } catch (error: any) {
    console.error('Fix email constraint error:', error)
    
    // If constraint is already removed, that's fine
    if (error.code === '42703' || error.message?.includes('does not exist')) {
      return NextResponse.json({ 
        success: true,
        message: 'Email constraint already allows NULL values'
      })
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix email constraint',
        details: error.message
      },
      { status: 500 }
    )
  }
}