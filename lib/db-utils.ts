import { sql } from './db'

// Helper to ensure database is available before executing queries
export async function withDatabase<T>(
  operation: (db: typeof sql) => Promise<T>
): Promise<T> {
  try {
    const db = sql
    if (typeof db === 'function') {
      return await operation(db)
    } else {
      throw new Error('Database connection not initialized')
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('DATABASE_URL')) {
      throw new Error('Database configuration error. Please check environment variables.')
    }
    throw error
  }
}

// Helper to handle API route errors
export function handleApiError(error: unknown): Response {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    if (error.message.includes('DATABASE_URL') || error.message.includes('Database')) {
      return Response.json(
        { success: false, error: 'Database configuration error' },
        { status: 500 }
      )
    }
    
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
  
  return Response.json(
    { success: false, error: 'An unexpected error occurred' },
    { status: 500 }
  )
}