import { NextRequest, NextResponse } from 'next/server'
import { migrationRunner, migrations } from '@/lib/migrations'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'migrate':
        await migrationRunner.runMigrations(migrations)
        return NextResponse.json({ 
          success: true, 
          message: 'Database migrations completed successfully' 
        })

      case 'rollback':
        const { version } = await request.json()
        if (!version) {
          return NextResponse.json({ 
            error: 'Version required for rollback' 
          }, { status: 400 })
        }
        await migrationRunner.rollbackMigration(version, migrations)
        return NextResponse.json({ 
          success: true, 
          message: `Migration ${version} rolled back successfully` 
        })

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use "migrate" or "rollback"' 
        }, { status: 400 })
    }
  } catch (error) {
    logger.error('Migration', 'Database migration failed', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const appliedMigrations = await getAppliedMigrations()
    const pendingMigrations = migrations
      .filter(m => !appliedMigrations.includes(m.version))
      .map(m => ({ version: m.version, name: m.name }))

    return NextResponse.json({
      appliedMigrations,
      pendingMigrations,
      totalMigrations: migrations.length
    })
  } catch (error) {
    logger.error('Migration', 'Failed to get migration status', error)
    return NextResponse.json({ 
      error: 'Failed to get migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to get applied migrations
async function getAppliedMigrations(): Promise<number[]> {
  const { sql } = await import('@/lib/db')
  try {
    const result = await sql`
      SELECT version FROM migrations ORDER BY version ASC
    `
    return result.map(row => row.version)
  } catch (error) {
    // If migrations table doesn't exist, return empty array
    return []
  }
}