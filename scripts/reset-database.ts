#!/usr/bin/env tsx

/**
 * Reset Database Script
 * Clears all data and resets sequences
 */

import { seeder } from '../lib/seeders'

async function resetDatabase() {
  try {
    console.log('🗑️  Clearing all database data...')
    await seeder.clearAllData()
    console.log('✅ Database reset completed successfully!')
  } catch (error) {
    console.error('❌ Database reset failed:', error)
    process.exit(1)
  }
}

resetDatabase()