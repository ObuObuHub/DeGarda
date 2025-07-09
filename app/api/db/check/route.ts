import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    // Check hospitals table structure if it exists
    let hospitalsSchema = null
    if (tables.some(t => t.table_name === 'hospitals')) {
      hospitalsSchema = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'hospitals'
        AND table_schema = 'public'
      `
    }

    // Check staff table structure if it exists
    let staffSchema = null
    if (tables.some(t => t.table_name === 'staff')) {
      staffSchema = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'staff'
        AND table_schema = 'public'
      `
    }

    return NextResponse.json({ 
      success: true, 
      tables: tables.map(t => t.table_name),
      hospitalsSchema,
      staffSchema
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || error.toString()
      },
      { status: 500 }
    )
  }
}