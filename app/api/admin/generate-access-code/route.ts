import { NextRequest, NextResponse } from 'next/server'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      // Only admin can generate access codes
      if (authUser.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admin can generate access codes' },
          { status: 403 }
        )
      }

      const { staffName, existingCodes } = await request.json()
      
      if (!staffName) {
        return NextResponse.json(
          { error: 'Staff name is required' },
          { status: 400 }
        )
      }

      // Generate 3-character access code based on name
      const accessCode = generateAccessCode(staffName, new Set(existingCodes || []))
      
      logger.info('AdminAPI', 'Access code generated', {
        staffName,
        accessCode,
        adminId: authUser.userId
      })

      return NextResponse.json({
        success: true,
        accessCode
      })

    } catch (error) {
      logger.error('AdminAPI', 'Failed to generate access code', { error, userId: authUser.userId })
      return NextResponse.json(
        { error: 'Failed to generate access code' },
        { status: 500 }
      )
    }
  })
}

// Generate 3-character access codes based on name
function generateAccessCode(name: string, existingCodes: Set<string>): string {
  // Extract initials and try variations
  const words = name.split(' ')
  let code = ''
  
  // Try initials first
  if (words.length >= 2) {
    code = words[0][0] + words[1][0] + (words[2]?.[0] || words[0][1] || 'X')
  } else {
    code = words[0].substring(0, 3).toUpperCase()
  }
  
  code = code.toUpperCase()
  
  // If code exists, try variations
  let counter = 1
  let originalCode = code
  while (existingCodes.has(code)) {
    code = originalCode.substring(0, 2) + counter.toString()
    counter++
  }
  
  return code
}