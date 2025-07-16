import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

// Verify user is admin or manager
async function verifyAdminOrManager(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    return decoded.role === 'admin' || decoded.role === 'manager'
  } catch {
    return false
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Verify admin or manager authentication
  const isAuthorized = await verifyAdminOrManager(request)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin or Manager access required' },
      { status: 401 }
    )
  }
  
  try {
    const body = await request.json()
    const { name, email, type, specialization, hospitalId, role } = body
    const staffId = parseInt(params.id)
    
    if (!name || !email || !type || !hospitalId) {
      return NextResponse.json(
        { error: 'Name, email, type, and hospital are required' },
        { status: 400 }
      )
    }
    
    // Check if staff exists
    const existing = await sql`
      SELECT id FROM staff WHERE id = ${staffId}
    `
    
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }
    
    // Check if email is being changed and already exists
    const emailCheck = await sql`
      SELECT id FROM staff WHERE email = ${email} AND id != ${staffId}
    `
    
    if (emailCheck.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }
    
    const result = await sql`
      UPDATE staff
      SET 
        name = ${name},
        email = ${email},
        role = ${role || 'staff'},
        hospital_id = ${parseInt(hospitalId)},
        specialization = ${specialization}
      WHERE id = ${staffId}
      RETURNING id, name, email, role, hospital_id, specialization, is_active, created_at
    `
    
    const staff = result[0]
    
    return NextResponse.json({
      id: staff.id.toString(),
      name: staff.name,
      email: staff.email,
      type,
      specialization: staff.specialization || '',
      hospitalId: staff.hospital_id.toString(),
      role: staff.role
    })
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  // Verify admin or manager authentication
  const isAuthorized = await verifyAdminOrManager(request)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin or Manager access required' },
      { status: 401 }
    )
  }
  
  try {
    const staffId = parseInt(params.id)
    
    // Check if staff has assigned shifts
    const shiftCount = await sql`
      SELECT COUNT(*) as count
      FROM shifts
      WHERE staff_id = ${staffId}
    `
    
    if (parseInt(shiftCount[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete staff member with assigned shifts' },
        { status: 400 }
      )
    }
    
    // Soft delete by setting is_active to false
    await sql`
      UPDATE staff
      SET is_active = false
      WHERE id = ${staffId}
    `
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
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
    const staffId = parseInt(params.id)
    
    // Get staff data with hospital info
    const result = await sql`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.role,
        s.hospital_id,
        s.specialization,
        s.is_active,
        s.created_at,
        h.name as hospital_name
      FROM staff s
      LEFT JOIN hospitals h ON s.hospital_id = h.id
      WHERE s.id = ${staffId}
    `
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }
    
    const staff = result[0]
    
    return NextResponse.json({
      id: staff.id.toString(),
      name: staff.name,
      email: staff.email,
      role: staff.role,
      type: 'doctor',
      specialization: staff.specialization || '',
      hospitalId: staff.hospital_id?.toString() || '',
      hospitalName: staff.hospital_name || '',
      isActive: staff.is_active,
      createdAt: staff.created_at
    })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff member' },
      { status: 500 }
    )
  }
}