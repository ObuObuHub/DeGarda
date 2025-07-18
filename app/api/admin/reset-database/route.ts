import { NextRequest, NextResponse } from 'next/server'
import { seeder } from '@/lib/seeders'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
    }

    logger.warn('Admin', 'Database reset requested')
    
    await seeder.clearAllData()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database reset completed successfully' 
    })
  } catch (error) {
    logger.error('Admin', 'Database reset failed', error)
    return NextResponse.json({ 
      error: 'Database reset failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}