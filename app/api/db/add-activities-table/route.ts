import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    // Create activities table
    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES staff(id),
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    // Create index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)
    `
    
    return NextResponse.json({ 
      success: true, 
      message: 'Activities table created successfully' 
    })
  } catch (error) {
    console.error('Error creating activities table:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create activities table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}