import { NextRequest, NextResponse } from 'next/server'
import { getRecentActivities } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const activities = await getRecentActivities(limit)
    
    return NextResponse.json({
      success: true,
      activities
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch activities' 
      },
      { status: 500 }
    )
  }
}