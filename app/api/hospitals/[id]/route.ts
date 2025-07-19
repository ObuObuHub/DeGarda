import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Verify user is admin only
async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin'
  } catch {
    return false
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Verify admin authentication
  const isAuthorized = await verifyAdmin(request)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    )
  }
  
  try {
    const body = await request.json()
    const { name } = body
    const hospitalId = parseInt(params.id)
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    // Check if hospital exists
    const existing = await sql`
      SELECT id FROM hospitals WHERE id = ${hospitalId}
    `
    
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Hospital not found' },
        { status: 404 }
      )
    }
    
    const result = await sql`
      UPDATE hospitals
      SET name = ${name}
      WHERE id = ${hospitalId}
      RETURNING id, name, city, created_at
    `
    
    const hospital = result[0]
    
    // Get staff count
    const staffCount = await sql`
      SELECT COUNT(*) as count
      FROM staff
      WHERE hospital_id = ${hospitalId}
    `
    
    // Count distinct departments for this hospital
    const departmentCount = await sql`
      SELECT COUNT(DISTINCT specialization) as count
      FROM staff
      WHERE hospital_id = ${hospitalId}
      AND specialization IS NOT NULL
      AND specialization != ''
    `
    
    return NextResponse.json({
      ...hospital,
      id: hospital.id.toString(),
      staff: parseInt(staffCount[0].count),
      departments: parseInt(departmentCount[0].count)
    })
  } catch (error) {
    console.error('Error updating hospital:', error)
    return NextResponse.json(
      { error: 'Failed to update hospital' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Verify admin authentication
  const isAuthorized = await verifyAdmin(request)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 401 }
    )
  }
  
  try {
    const hospitalId = parseInt(params.id)
    
    // Check if hospital has staff
    const staffCount = await sql`
      SELECT COUNT(*) as count
      FROM staff
      WHERE hospital_id = ${hospitalId}
    `
    
    if (parseInt(staffCount[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete hospital with assigned staff' },
        { status: 400 }
      )
    }
    
    // Check if hospital has shifts
    const shiftCount = await sql`
      SELECT COUNT(*) as count
      FROM shifts
      WHERE hospital_id = ${hospitalId}
    `
    
    if (parseInt(shiftCount[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete hospital with assigned shifts' },
        { status: 400 }
      )
    }
    
    // Delete hospital
    await sql`
      DELETE FROM hospitals
      WHERE id = ${hospitalId}
    `
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hospital:', error)
    return NextResponse.json(
      { error: 'Failed to delete hospital' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const hospitalId = parseInt(params.id)
    
    // Get hospital data
    const result = await sql`
      SELECT id, name, city, created_at
      FROM hospitals
      WHERE id = ${hospitalId}
    `
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Hospital not found' },
        { status: 404 }
      )
    }
    
    const hospital = result[0]
    
    // Get staff count
    const staffCount = await sql`
      SELECT COUNT(*) as count
      FROM staff
      WHERE hospital_id = ${hospitalId}
    `
    
    // Count distinct departments for this hospital
    const departmentCount = await sql`
      SELECT COUNT(DISTINCT specialization) as count
      FROM staff
      WHERE hospital_id = ${hospitalId}
      AND specialization IS NOT NULL
      AND specialization != ''
    `
    
    return NextResponse.json({
      id: hospital.id.toString(),
      name: hospital.name,
      city: hospital.city,
      staff: parseInt(staffCount[0].count),
      departments: parseInt(departmentCount[0].count),
      created_at: hospital.created_at
    })
  } catch (error) {
    console.error('Error fetching hospital:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hospital' },
      { status: 500 }
    )
  }
}