import { NextRequest, NextResponse } from 'next/server'
import { migrationRunner, migrations } from '@/lib/migrations'
import { seeder } from '@/lib/seeders'
import { logger } from '@/lib/logger'

// Admin-only database management endpoint
// This should only be accessible to system administrators
export async function POST(request: NextRequest) {
  try {
    // Check for admin API key in environment
    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      logger.error('DatabaseManage', 'Admin API key not configured')
      return NextResponse.json({
        error: 'Database management is not configured'
      }, { status: 503 })
    }

    // Verify admin API key
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('DatabaseManage', 'Missing or invalid authorization header')
      return NextResponse.json({
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    const providedKey = authHeader.slice(7) // Remove 'Bearer ' prefix
    if (providedKey !== adminApiKey) {
      logger.warn('DatabaseManage', 'Invalid admin API key attempt')
      return NextResponse.json({
        error: 'Invalid admin credentials'
      }, { status: 401 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'setup':
        // Run all migrations and seed data
        await migrationRunner.runMigrations(migrations)
        const credentials = await seeder.seedAll()
        
        return NextResponse.json({
          success: true,
          message: 'Database setup completed successfully',
          credentials
        })

      case 'reset':
        // Clear all data and reseed
        await seeder.clearAllData()
        const newCredentials = await seeder.seedAll()
        
        return NextResponse.json({
          success: true,
          message: 'Database reset completed successfully',
          credentials: newCredentials
        })

      case 'seed':
        // Just seed data (assumes migrations are already run)
        const seedCredentials = await seeder.seedAll()
        
        return NextResponse.json({
          success: true,
          message: 'Database seeding completed successfully',
          credentials: seedCredentials
        })

      default:
        return NextResponse.json({
          error: 'Invalid action. Use "setup", "reset", or "seed"'
        }, { status: 400 })
    }
  } catch (error) {
    logger.error('DatabaseManage', 'Database management operation failed', error)
    return NextResponse.json({
      error: 'Database operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for admin API key in environment
    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      logger.error('DatabaseManage', 'Admin API key not configured')
      return NextResponse.json({
        error: 'Database management is not configured'
      }, { status: 503 })
    }

    // Verify admin API key
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('DatabaseManage', 'Missing or invalid authorization header')
      return NextResponse.json({
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    const providedKey = authHeader.slice(7) // Remove 'Bearer ' prefix
    if (providedKey !== adminApiKey) {
      logger.warn('DatabaseManage', 'Invalid admin API key attempt')
      return NextResponse.json({
        error: 'Invalid admin credentials'
      }, { status: 401 })
    }

    // Get database status
    const { sql } = await import('@/lib/db')
    
    // Check if migrations table exists
    const migrationTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      )
    `
    
    // Get applied migrations if table exists
    let appliedMigrations = []
    if (migrationTableExists[0].exists) {
      const result = await sql`
        SELECT version, name, applied_at FROM migrations ORDER BY version ASC
      `
      appliedMigrations = result
    }
    
    // Check if we have hospitals (indicates seeded data)
    const hospitalCount = await sql`
      SELECT COUNT(*) as count FROM hospitals
    `
    
    const staffCount = await sql`
      SELECT COUNT(*) as count FROM staff
    `
    
    const pendingMigrations = migrations
      .filter(m => !appliedMigrations.find(am => am.version === m.version))
      .map(m => ({ version: m.version, name: m.name }))

    return NextResponse.json({
      migrationsApplied: appliedMigrations.length,
      migrationsPending: pendingMigrations.length,
      totalMigrations: migrations.length,
      hospitalsCount: hospitalCount[0].count,
      staffCount: staffCount[0].count,
      appliedMigrations,
      pendingMigrations,
      isSeeded: hospitalCount[0].count > 0 && staffCount[0].count > 0
    })
  } catch (error) {
    logger.error('DatabaseManage', 'Failed to get database status', error)
    return NextResponse.json({
      error: 'Failed to get database status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}