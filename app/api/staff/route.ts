import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { generateMemorablePassword } from '@/lib/password-generator'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hospitalId = searchParams.get('hospitalId')
    
    let query = sql`
      SELECT id, name, email, role, hospital_id, specialization, is_active, created_at
      FROM staff
      WHERE is_active = true
    `
    
    if (hospitalId) {
      query = sql`
        SELECT id, name, email, role, hospital_id, specialization, is_active, created_at
        FROM staff
        WHERE is_active = true AND hospital_id = ${parseInt(hospitalId)}
      `
    }
    
    const staffMembers = await query
    
    // Transform data to match frontend expectations
    const transformedStaff = staffMembers.map(member => {
      // Determine type based on name prefix or specialization
      let type: 'medic' | 'biolog' | 'chimist' | 'asistent' = 'medic'
      
      if (member.name.includes('Dr.')) {
        type = 'medic'
      } else if (member.name.includes('Biol.')) {
        type = 'biolog'
      } else if (member.name.includes('Ch.')) {
        type = 'chimist'
      } else if (member.name.includes('As.')) {
        type = 'asistent'
      } else if (member.specialization?.toLowerCase().includes('biolog')) {
        type = 'biolog'
      } else if (member.specialization?.toLowerCase().includes('chimist')) {
        type = 'chimist'
      } else if (member.specialization?.toLowerCase().includes('asistent')) {
        type = 'asistent'
      }
      
      return {
        id: member.id.toString(),
        name: member.name,
        email: member.email,
        type,
        specialization: member.specialization || '',
        hospitalId: member.hospital_id?.toString() || '',
        role: member.role
      }
    })
    
    return NextResponse.json(transformedStaff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Auth disabled temporarily
  // const isAuthorized = await verifyAdminOrManager(request)
  // if (!isAuthorized) {
  //   return NextResponse.json(
  //     { error: 'Unauthorized' },
  //     { status: 401 }
  //   )
  // }
  
  try {
    const body = await request.json()
    const { name, email, type, specialization, hospitalId, role = 'staff' } = body
    
    if (!name || !type || !hospitalId) {
      return NextResponse.json(
        { error: 'Name, type, and hospital are required' },
        { status: 400 }
      )
    }
    
    // Check if email already exists (only if email is provided)
    if (email) {
      const existing = await sql`
        SELECT id FROM staff WHERE email = ${email}
      `
      
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }
    
    // Generate a secure temporary password
    const tempPassword = generateMemorablePassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)
    
    // TODO: Send this password to the user via secure email
    
    const result = await sql`
      INSERT INTO staff (name, email, password, role, hospital_id, specialization, is_active)
      VALUES (${name}, ${email || null}, ${hashedPassword}, ${role}, ${parseInt(hospitalId)}, ${specialization}, true)
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
    console.error('Error creating staff:', error)
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    )
  }
}