import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get notifications
    const notifications = unreadOnly
      ? await sql`
          SELECT id, type, title, message, read, created_at
          FROM notifications
          WHERE user_id = ${userId} AND read = false
          ORDER BY created_at DESC
          LIMIT 50
        `
      : await sql`
          SELECT id, type, title, message, read, created_at
          FROM notifications
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 50
        `

    // Get unread count
    const unreadCount = await sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${userId} AND read = false
    `

    return NextResponse.json({ 
      success: true, 
      notifications,
      unreadCount: parseInt(unreadCount[0].count)
    })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const { notificationIds, userId } = await request.json()

    if (!notificationIds || !userId) {
      return NextResponse.json(
        { success: false, error: 'Notification IDs and user ID are required' },
        { status: 400 }
      )
    }

    // Mark as read
    await sql`
      UPDATE notifications
      SET read = true
      WHERE id = ANY(${notificationIds})
        AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark notifications read error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}