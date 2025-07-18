import { NextRequest, NextResponse } from 'next/server'
import { seeder } from '@/lib/seeders'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    logger.info('Admin', 'Database seeding requested')
    
    const credentials = await seeder.seedAll()
    
    // Return the admin access code for login
    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully',
      adminAccessCode: 'ADM',
      credentials: {
        admin: credentials.admin,
        staffCount: credentials.staff.length
      }
    })
  } catch (error) {
    logger.error('Admin', 'Database seeding failed', error)
    return NextResponse.json({ 
      error: 'Database seeding failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}