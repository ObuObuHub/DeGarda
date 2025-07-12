import { sql } from '@/lib/db'

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'shift_assigned'
  | 'shift_swapped'
  | 'shift_reserved'
  | 'staff_created'
  | 'staff_updated'
  | 'hospital_created'
  | 'schedule_generated'

export interface Activity {
  id: number
  userId: number
  type: ActivityType
  description: string
  metadata?: Record<string, any>
  createdAt: Date
}

/**
 * Log an activity to the database
 */
export async function logActivity(
  userId: number,
  type: ActivityType,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await sql`
      INSERT INTO activities (user_id, type, description, metadata, created_at)
      VALUES (${userId}, ${type}, ${description}, ${JSON.stringify(metadata || {})}, NOW())
    `
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

/**
 * Get recent activities
 */
export async function getRecentActivities(limit: number = 10): Promise<Activity[]> {
  try {
    const activities = await sql`
      SELECT 
        a.id,
        a.user_id as "userId",
        a.type,
        a.description,
        a.metadata,
        a.created_at as "createdAt",
        s.name as "userName"
      FROM activities a
      JOIN staff s ON a.user_id = s.id
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `
    
    return activities.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : undefined
    }))
  } catch (error) {
    console.error('Failed to get recent activities:', error)
    return []
  }
}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(userId: number, limit: number = 20): Promise<Activity[]> {
  try {
    const activities = await sql`
      SELECT 
        id,
        user_id as "userId",
        type,
        description,
        metadata,
        created_at as "createdAt"
      FROM activities
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    
    return activities.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : undefined
    }))
  } catch (error) {
    console.error('Failed to get user activities:', error)
    return []
  }
}