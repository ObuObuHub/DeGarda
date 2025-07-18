/**
 * Database seeding system for DeGarda
 * Handles initial data population with proper error handling
 */

import { sql } from './db'
import { logger } from './logger'
import bcrypt from 'bcryptjs'
// Password generator removed during authentication simplification

export interface SeederCredentials {
  admin: { email: string; password: string }
  manager: { email: string; password: string }
  staff: Array<{ email: string; password: string; name: string }>
}

export class DatabaseSeeder {
  // Generate 3-character access codes based on name
  private generateAccessCode(name: string, existingCodes: Set<string>): string {
    // Extract initials and try variations
    const words = name.split(' ')
    let code = ''
    
    // Try initials first
    if (words.length >= 2) {
      code = words[0][0] + words[1][0] + words[2]?.[0] || words[0][1] || 'X'
    } else {
      code = words[0].substring(0, 3).toUpperCase()
    }
    
    code = code.toUpperCase()
    
    // If code exists, try variations
    let counter = 1
    let originalCode = code
    while (existingCodes.has(code)) {
      code = originalCode.substring(0, 2) + counter.toString()
      counter++
    }
    
    existingCodes.add(code)
    return code
  }

  async seedHospitals(): Promise<number[]> {
    logger.info('Seeder', 'Skipping hospital seeding - admin will add hospitals manually')
    
    // Create a default hospital for admin user if none exists
    const existingHospitals = await sql`
      SELECT id FROM hospitals ORDER BY id LIMIT 1
    `
    
    if (existingHospitals.length === 0) {
      const defaultHospital = await sql`
        INSERT INTO hospitals (name, city) VALUES 
          ('System Default', 'Admin')
        RETURNING id
      `
      return [defaultHospital[0].id]
    }
    
    return existingHospitals.map(h => h.id)
  }

  async seedAdminUsers(hospitalIds: number[]): Promise<SeederCredentials['admin']> {
    logger.info('Seeder', 'Seeding admin user')
    
    const adminPassword = Math.random().toString(36).slice(-12) // Simple password generation
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
    
    const primaryHospitalId = hospitalIds[0]
    const adminAccessCode = 'ADM' // Simple 3-character code for admin
    
    await sql`
      INSERT INTO staff (name, email, password, role, hospital_id, specialization, access_code) VALUES
        ('Admin User', 'admin@degarda.ro', ${adminPasswordHash}, 'admin', ${primaryHospitalId}, 'Administration', ${adminAccessCode})
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        hospital_id = EXCLUDED.hospital_id,
        access_code = EXCLUDED.access_code
    `
    
    return {
      admin: { email: 'admin@degarda.ro', password: adminPassword }
    }
  }

  async seedStaffMembers(hospitalIds: number[]): Promise<SeederCredentials['staff']> {
    logger.info('Seeder', 'Skipping staff seeding - admin will add staff manually')
    
    // Return empty array - no staff seeded
    return []
  }

  async seedAll(): Promise<SeederCredentials> {
    try {
      logger.info('Seeder', 'Starting database seeding')
      
      const hospitalIds = await this.seedHospitals()
      const adminCredentials = await this.seedAdminUsers(hospitalIds)
      const staffCredentials = await this.seedStaffMembers(hospitalIds)
      
      logger.info('Seeder', 'Database seeding completed successfully', {
        hospitals: hospitalIds.length,
        staff: staffCredentials.length
      })
      
      return {
        admin: adminCredentials.admin,
        manager: { email: '', password: '' }, // No manager anymore
        staff: staffCredentials
      }
    } catch (error) {
      logger.error('Seeder', 'Database seeding failed', error)
      throw error
    }
  }

  async clearAllData(): Promise<void> {
    logger.warn('Seeder', 'Clearing all database data')
    
    // Clear in correct order to avoid foreign key constraints
    await sql`TRUNCATE TABLE activities CASCADE`
    await sql`TRUNCATE TABLE notifications CASCADE`
    await sql`TRUNCATE TABLE shift_swaps CASCADE`
    await sql`TRUNCATE TABLE reservations CASCADE`
    await sql`TRUNCATE TABLE shifts CASCADE`
    await sql`TRUNCATE TABLE staff_unavailability CASCADE`
    await sql`TRUNCATE TABLE staff CASCADE`
    await sql`TRUNCATE TABLE hospitals CASCADE`
    
    // Reset sequences
    await sql`ALTER SEQUENCE hospitals_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE staff_id_seq RESTART WITH 1`
    await sql`ALTER SEQUENCE shifts_id_seq RESTART WITH 1`
    
    logger.warn('Seeder', 'All database data cleared')
  }
}

export const seeder = new DatabaseSeeder()