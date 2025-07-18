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
    logger.info('Seeder', 'Seeding hospitals')
    
    const hospitals = await sql`
      INSERT INTO hospitals (name, city) VALUES 
        ('Spitalul Județean de Urgență Piatra-Neamț', 'Piatra-Neamț'),
        ('Spitalul Municipal Buhusi', 'Buhusi')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    
    // If no hospitals were inserted (they already exist), get existing ones
    if (hospitals.length === 0) {
      const existingHospitals = await sql`
        SELECT id FROM hospitals ORDER BY id LIMIT 2
      `
      return existingHospitals.map(h => h.id)
    }
    
    return hospitals.map(h => h.id)
  }

  async seedAdminUsers(hospitalIds: number[]): Promise<SeederCredentials['admin']> {
    logger.info('Seeder', 'Seeding admin user')
    
    const adminPassword = Math.random().toString(36).slice(-12) // Simple password generation
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
    
    const primaryHospitalId = hospitalIds[0]
    const adminAccessCode = 'ADM' // Simple 3-character code for admin
    
    await sql`
      INSERT INTO staff (name, email, password, role, hospital_id, specialization, access_code) VALUES
        ('Administrator Principal', 'admin@degarda.ro', ${adminPasswordHash}, 'admin', ${primaryHospitalId}, 'Administration', ${adminAccessCode})
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
    logger.info('Seeder', 'Seeding staff members')
    
    const staffMembers = [
      { name: 'Dr. Zugun Eduard', email: 'zugun.eduard@degarda.ro', specialization: 'ATI' },
      { name: 'Dr. Gîlea Arina', email: 'gilea.arina@degarda.ro', specialization: 'Urgențe' },
      { name: 'Dr. Manole Anca', email: 'manole.anca@degarda.ro', specialization: 'Medicină Internă' },
      { name: 'Biol. Alforei Magda Elena', email: 'alforei.magda@degarda.ro', specialization: 'Laborator' },
      { name: 'Dr. Rusica Iovu Elena', email: 'rusica.elena@degarda.ro', specialization: 'Chirurgie' },
      { name: 'Dr. Grădinariu Cristina', email: 'gradinariu.cristina@degarda.ro', specialization: 'ATI' },
      { name: 'Dr. Ciorsac Alina', email: 'ciorsac.alina@degarda.ro', specialization: 'Urgențe' },
      { name: 'Dr. Constantinescu Raluca', email: 'constantinescu.raluca@degarda.ro', specialization: 'Medicină Internă' },
      { name: 'Dr. Dobrea Letiția', email: 'dobrea.letitia@degarda.ro', specialization: 'Chirurgie' },
      { name: 'Ch. Dobre Liliana Gabriela', email: 'dobre.liliana@degarda.ro', specialization: 'Laborator' },
      { name: 'Dr. Chiper Leferman Andrei', email: 'chiper.andrei@degarda.ro', specialization: 'ATI' }
    ]

    const credentials: SeederCredentials['staff'] = []
    const existingCodes = new Set<string>(['ADM']) // Reserve admin code
    
    for (let i = 0; i < staffMembers.length; i++) {
      const member = staffMembers[i]
      const password = Math.random().toString(36).slice(-10) // Simple password generation
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Generate 3-character access code
      const accessCode = this.generateAccessCode(member.name, existingCodes)
      
      // Distribute staff across hospitals
      const hospitalId = hospitalIds[i % hospitalIds.length]
      
      await sql`
        INSERT INTO staff (name, email, password, role, hospital_id, specialization, access_code) VALUES
          (${member.name}, ${member.email}, ${hashedPassword}, 'staff', ${hospitalId}, ${member.specialization}, ${accessCode})
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          hospital_id = EXCLUDED.hospital_id,
          specialization = EXCLUDED.specialization,
          access_code = EXCLUDED.access_code
      `
      
      credentials.push({
        email: member.email,
        password,
        name: member.name
      })
    }
    
    return credentials
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
    await sql`TRUNCATE TABLE shift_reservations CASCADE`
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