/**
 * Proper database migration system for DeGarda
 * Replaces the scattered init/fix/reset chaos with structured versioned migrations
 */

import { sql } from './db'
import { logger } from './logger'
import bcrypt from 'bcryptjs'
// Password generator removed during authentication simplification

export interface Migration {
  version: number
  name: string
  up: () => Promise<void>
  down: () => Promise<void>
}

export class MigrationRunner {
  private async ensureMigrationTable() {
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  }

  private async getAppliedMigrations(): Promise<number[]> {
    const result = await sql`
      SELECT version FROM migrations ORDER BY version ASC
    `
    return result.map(row => row.version)
  }

  private async recordMigration(migration: Migration) {
    await sql`
      INSERT INTO migrations (version, name) 
      VALUES (${migration.version}, ${migration.name})
    `
  }

  private async removeMigration(version: number) {
    await sql`DELETE FROM migrations WHERE version = ${version}`
  }

  async runMigrations(migrations: Migration[]) {
    await this.ensureMigrationTable()
    const appliedVersions = await this.getAppliedMigrations()
    
    const pendingMigrations = migrations
      .filter(m => !appliedVersions.includes(m.version))
      .sort((a, b) => a.version - b.version)

    logger.info('Migration', `Running ${pendingMigrations.length} pending migrations`)

    for (const migration of pendingMigrations) {
      try {
        logger.info('Migration', `Applying migration ${migration.version}: ${migration.name}`)
        await migration.up()
        await this.recordMigration(migration)
        logger.info('Migration', `Migration ${migration.version} applied successfully`)
      } catch (error) {
        logger.error('Migration', `Failed to apply migration ${migration.version}`, error)
        throw error
      }
    }
  }

  async rollbackMigration(version: number, migrations: Migration[]) {
    const migration = migrations.find(m => m.version === version)
    if (!migration) {
      throw new Error(`Migration ${version} not found`)
    }

    try {
      logger.info('Migration', `Rolling back migration ${version}: ${migration.name}`)
      await migration.down()
      await this.removeMigration(version)
      logger.info('Migration', `Migration ${version} rolled back successfully`)
    } catch (error) {
      logger.error('Migration', `Failed to rollback migration ${version}`, error)
      throw error
    }
  }
}

// Migration definitions
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_initial_tables',
    up: async () => {
      // Create hospitals table
      await sql`
        CREATE TABLE IF NOT EXISTS hospitals (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          city VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create staff table
      await sql`
        CREATE TABLE IF NOT EXISTS staff (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'staff')),
          type VARCHAR(50) DEFAULT 'medic' CHECK (type IN ('medic', 'biolog', 'chimist', 'asistent')),
          hospital_id INTEGER REFERENCES hospitals(id),
          specialization VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create shifts table
      await sql`
        CREATE TABLE IF NOT EXISTS shifts (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('day', 'night', '24h', '12h')),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          staff_id INTEGER REFERENCES staff(id),
          hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
          status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'reserved')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create other tables
      await sql`
        CREATE TABLE IF NOT EXISTS shift_reservations (
          id SERIAL PRIMARY KEY,
          shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
          staff_id INTEGER NOT NULL REFERENCES staff(id),
          reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(shift_id, staff_id)
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS shift_swaps (
          id SERIAL PRIMARY KEY,
          from_staff_id INTEGER NOT NULL REFERENCES staff(id),
          to_staff_id INTEGER REFERENCES staff(id),
          shift_id INTEGER NOT NULL REFERENCES shifts(id),
          reason TEXT,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
          reviewed_by INTEGER REFERENCES staff(id),
          reviewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS staff_unavailability (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff(id),
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(staff_id, date)
        )
      `

      await sql`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES staff(id),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP
        )
      `
    },
    down: async () => {
      await sql`DROP TABLE IF EXISTS notifications CASCADE`
      await sql`DROP TABLE IF EXISTS staff_unavailability CASCADE`
      await sql`DROP TABLE IF EXISTS shift_swaps CASCADE`
      await sql`DROP TABLE IF EXISTS shift_reservations CASCADE`
      await sql`DROP TABLE IF EXISTS shifts CASCADE`
      await sql`DROP TABLE IF EXISTS staff CASCADE`
      await sql`DROP TABLE IF EXISTS hospitals CASCADE`
    }
  },

  {
    version: 2,
    name: 'add_department_column',
    up: async () => {
      // Add department column to shifts
      await sql`
        ALTER TABLE shifts 
        ADD COLUMN IF NOT EXISTS department VARCHAR(255)
      `
    },
    down: async () => {
      await sql`ALTER TABLE shifts DROP COLUMN IF EXISTS department`
    }
  },

  {
    version: 3,
    name: 'update_shift_constraints',
    up: async () => {
      // Drop old constraints if they exist
      await sql`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_key`
      await sql`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_hospital_id_key`
      
      // Add new constraint that includes department (only if it doesn't exist)
      await sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'shifts_date_type_hospital_id_department_key'
          ) THEN
            ALTER TABLE shifts
            ADD CONSTRAINT shifts_date_type_hospital_id_department_key 
            UNIQUE (date, type, hospital_id, department);
          END IF;
        END $$;
      `
    },
    down: async () => {
      await sql`ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_date_type_hospital_id_department_key`
      await sql`
        ALTER TABLE shifts
        ADD CONSTRAINT shifts_date_type_hospital_id_key 
        UNIQUE (date, type, hospital_id)
      `
    }
  },

  {
    version: 4,
    name: 'create_indexes',
    up: async () => {
      await sql`CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date)`
      await sql`CREATE INDEX IF NOT EXISTS idx_shifts_hospital ON shifts(hospital_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_shifts_department ON shifts(department)`
      // Skip shift_reservations indexes as table will be recreated in migration 7
      await sql`CREATE INDEX IF NOT EXISTS idx_swaps_from_staff ON shift_swaps(from_staff_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_swaps_status ON shift_swaps(status)`
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`
      await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`
    },
    down: async () => {
      await sql`DROP INDEX IF EXISTS idx_shifts_date`
      await sql`DROP INDEX IF EXISTS idx_shifts_hospital`
      await sql`DROP INDEX IF EXISTS idx_shifts_staff`
      await sql`DROP INDEX IF EXISTS idx_shifts_department`
      await sql`DROP INDEX IF EXISTS idx_reservations_staff`
      await sql`DROP INDEX IF EXISTS idx_swaps_from_staff`
      await sql`DROP INDEX IF EXISTS idx_swaps_status`
      await sql`DROP INDEX IF EXISTS idx_notifications_user`
      await sql`DROP INDEX IF EXISTS idx_notifications_read`
      await sql`DROP INDEX IF EXISTS idx_notifications_created`
    }
  },

  {
    version: 5,
    name: 'add_activities_table',
    up: async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS activities (
          id SERIAL PRIMARY KEY,
          hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
          staff_id INTEGER REFERENCES staff(id),
          type VARCHAR(50) NOT NULL,
          action VARCHAR(255) NOT NULL,
          details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_activities_hospital ON activities(hospital_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_activities_staff ON activities(staff_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`
      await sql`CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC)`
    },
    down: async () => {
      await sql`DROP TABLE IF EXISTS activities CASCADE`
    }
  },

  {
    version: 6,
    name: 'add_access_codes_table',
    up: async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS access_codes (
          id SERIAL PRIMARY KEY,
          code_hash VARCHAR(255) NOT NULL,
          hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
          role VARCHAR(50) NOT NULL CHECK (role IN ('staff', 'manager')),
          staff_id INTEGER REFERENCES staff(id),
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_access_codes_hospital ON access_codes(hospital_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_access_codes_role ON access_codes(role)`
      await sql`CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(is_active)`
      await sql`CREATE INDEX IF NOT EXISTS idx_access_codes_expires ON access_codes(expires_at)`
    },
    down: async () => {
      await sql`DROP TABLE IF EXISTS access_codes CASCADE`
    }
  },

  {
    version: 7,
    name: 'fix_shift_reservations_table',
    up: async () => {
      // Drop the old shift_reservations table that incorrectly referenced shift_id
      await sql`DROP TABLE IF EXISTS shift_reservations CASCADE`
      
      // Create new shift_reservations table for staff reservation requests
      await sql`
        CREATE TABLE IF NOT EXISTS shift_reservations (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff(id),
          hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
          shift_date DATE NOT NULL,
          department VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'fulfilled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(staff_id, shift_date)
        )
      `
      
      await sql`CREATE INDEX IF NOT EXISTS idx_reservations_staff_hospital ON shift_reservations(staff_id, hospital_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_reservations_date ON shift_reservations(shift_date)`
      await sql`CREATE INDEX IF NOT EXISTS idx_reservations_status ON shift_reservations(status)`
    },
    down: async () => {
      await sql`DROP TABLE IF EXISTS shift_reservations CASCADE`
      
      // Restore old table structure
      await sql`
        CREATE TABLE IF NOT EXISTS shift_reservations (
          id SERIAL PRIMARY KEY,
          shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
          staff_id INTEGER NOT NULL REFERENCES staff(id),
          reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(shift_id, staff_id)
        )
      `
    }
  }
]

export const migrationRunner = new MigrationRunner()

// Helper function to get applied migrations (fix the scope issue)
async function getAppliedMigrations(): Promise<number[]> {
  const result = await sql`
    SELECT version FROM migrations ORDER BY version ASC
  `
  return result.map(row => row.version)
}