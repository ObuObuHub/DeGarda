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
  async seedHospitals(): Promise<number[]> {
    logger.info('Seeder', 'Seeding hospitals')
    
    const hospitals = await sql`
      INSERT INTO hospitals (name, city) VALUES 
        ('Spitalul Județean de Urgență Piatra-Neamț', 'Piatra-Neamț'),
        ('Spitalul Municipal Buhusi', 'Buhusi'),
        ('Spitalul Municipal', 'Roman')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    
    // If no hospitals were inserted (they already exist), get existing ones
    if (hospitals.length === 0) {
      const existingHospitals = await sql`
        SELECT id FROM hospitals ORDER BY id LIMIT 3
      `
      return existingHospitals.map(h => h.id)
    }
    
    return hospitals.map(h => h.id)
  }

  async seedAdminUsers(hospitalIds: number[]): Promise<SeederCredentials['admin' | 'manager']> {
    logger.info('Seeder', 'Seeding admin users')
    
    const adminPassword = Math.random().toString(36).slice(-12) // Simple password generation
    const managerPassword = Math.random().toString(36).slice(-12) // Simple password generation
    
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10)
    const managerPasswordHash = await bcrypt.hash(managerPassword, 10)
    
    const primaryHospitalId = hospitalIds[0]
    
    await sql`
      INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
        ('Administrator Principal', 'admin@degarda.ro', ${adminPasswordHash}, 'admin', 'medic', ${primaryHospitalId}, 'Administration'),
        ('Manager Gărzi', 'manager@degarda.ro', ${managerPasswordHash}, 'manager', 'medic', ${primaryHospitalId}, 'Management')
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        hospital_id = EXCLUDED.hospital_id
    `
    
    return {
      admin: { email: 'admin@degarda.ro', password: adminPassword },
      manager: { email: 'manager@degarda.ro', password: managerPassword }
    }
  }

  async seedStaffMembers(hospitalIds: number[]): Promise<SeederCredentials['staff']> {
    logger.info('Seeder', 'Seeding staff members')
    
    const staffMembers = [
      { name: 'Dr. Zugun Eduard', type: 'medic', email: 'zugun.eduard@degarda.ro', specialization: 'ATI' },
      { name: 'Dr. Gîlea Arina', type: 'medic', email: 'gilea.arina@degarda.ro', specialization: 'Urgențe' },
      { name: 'Dr. Manole Anca', type: 'medic', email: 'manole.anca@degarda.ro', specialization: 'Medicină Internă' },
      { name: 'Biol. Alforei Magda Elena', type: 'biolog', email: 'alforei.magda@degarda.ro', specialization: 'Laborator' },
      { name: 'Dr. Rusica Iovu Elena', type: 'medic', email: 'rusica.elena@degarda.ro', specialization: 'Chirurgie' },
      { name: 'Dr. Grădinariu Cristina', type: 'medic', email: 'gradinariu.cristina@degarda.ro', specialization: 'ATI' },
      { name: 'Dr. Ciorsac Alina', type: 'medic', email: 'ciorsac.alina@degarda.ro', specialization: 'Urgențe' },
      { name: 'Dr. Constantinescu Raluca', type: 'medic', email: 'constantinescu.raluca@degarda.ro', specialization: 'Medicină Internă' },
      { name: 'Dr. Dobrea Letiția', type: 'medic', email: 'dobrea.letitia@degarda.ro', specialization: 'Chirurgie' },
      { name: 'Ch. Dobre Liliana Gabriela', type: 'chimist', email: 'dobre.liliana@degarda.ro', specialization: 'Laborator' },
      { name: 'Dr. Chiper Leferman Andrei', type: 'medic', email: 'chiper.andrei@degarda.ro', specialization: 'ATI' }
    ]

    const credentials: SeederCredentials['staff'] = []
    
    for (let i = 0; i < staffMembers.length; i++) {
      const member = staffMembers[i]
      const password = Math.random().toString(36).slice(-10) // Simple password generation
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Distribute staff across hospitals
      const hospitalId = hospitalIds[i % hospitalIds.length]
      
      await sql`
        INSERT INTO staff (name, email, password, role, type, hospital_id, specialization) VALUES
          (${member.name}, ${member.email}, ${hashedPassword}, 'staff', ${member.type}, ${hospitalId}, ${member.specialization})
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          hospital_id = EXCLUDED.hospital_id,
          specialization = EXCLUDED.specialization
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
        manager: adminCredentials.manager,
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