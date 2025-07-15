#!/usr/bin/env tsx
/**
 * Run database migrations for DeGarda
 */

import { migrationRunner, migrations } from '../lib/migrations'
import { logger } from '../lib/logger'

async function runMigrations() {
  try {
    logger.info('Migration', 'Starting database migrations...')
    await migrationRunner.runMigrations(migrations)
    logger.info('Migration', 'All migrations completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error('Migration', 'Migration failed', error)
    process.exit(1)
  }
}

runMigrations()