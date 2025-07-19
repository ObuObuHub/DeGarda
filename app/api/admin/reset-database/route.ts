import { NextRequest, NextResponse } from 'next/server'
import { seeder } from '@/lib/seeders'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
      }

      // Only admins can reset the database
      if (authUser.role !== 'admin') {
        logger.warn('Admin', 'Unauthorized database reset attempt', {
          userId: authUser.userId,
          role: authUser.role,
          name: authUser.name
        })
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      logger.warn('Admin', 'Database reset requested by admin', {
        adminId: authUser.userId,
        adminName: authUser.name,
        hospitalId: authUser.hospitalId
      })
      
      await seeder.clearAllData()
      
      logger.info('Admin', 'Database reset completed', {
        resetBy: authUser.userId,
        resetByName: authUser.name
      })
      
      return NextResponse.json({ 
        success: true, 
        message: `Database reset completed successfully by ${authUser.name}` 
      })
    } catch (error) {
      logger.error('Admin', 'Database reset failed', error, {
        userId: authUser.userId,
        userName: authUser.name
      })
      return NextResponse.json({ 
        error: 'Database reset failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 })
    }
  })
}