/**
 * Staff Password Authentication System for DeGarda
 * Implements staff-specific password authentication with identity lookup
 */

import { sql } from './db'
import { logger } from './logger'
import bcrypt from 'bcryptjs'

export interface StaffAuthResult {
  success: boolean
  user?: {
    id: number
    name: string
    email: string
    role: 'staff' | 'manager'
    hospitalId: number
    hospitalName: string
    specialization?: string
  }
  error?: string
}

export interface StaffPasswordData {
  id: string
  staffId: number
  staffName: string
  password: string
  hospitalId: number
  hospitalName: string
  role: string
  specialization: string
  isActive: boolean
  createdAt: string
}

export class StaffPasswordManager {
  
  /**
   * Authenticate using a staff-specific password
   */
  async authenticateWithPassword(password: string): Promise<StaffAuthResult> {
    try {
      if (!password || password.trim() === '') {
        return { success: false, error: 'Parolă necesară' }
      }
      
      // Get all active staff passwords with staff and hospital details
      const staffPasswords = await sql`
        SELECT 
          sp.id,
          sp.staff_id,
          sp.password_hash,
          sp.password_plain,
          sp.hospital_id,
          s.name as staff_name,
          s.email,
          s.role,
          s.specialization,
          h.name as hospital_name
        FROM staff_passwords sp
        JOIN staff s ON sp.staff_id = s.id
        JOIN hospitals h ON sp.hospital_id = h.id
        WHERE sp.is_active = true 
        AND s.is_active = true
      `
      
      // Check each password until we find a match
      for (const dbPassword of staffPasswords) {
        const isMatch = await bcrypt.compare(password.trim(), dbPassword.password_hash)
        
        if (isMatch) {
          logger.info('StaffAuth', 'Staff password authentication successful', {
            staffId: dbPassword.staff_id,
            staffName: dbPassword.staff_name,
            hospitalId: dbPassword.hospital_id,
            role: dbPassword.role
          })
          
          return {
            success: true,
            user: {
              id: dbPassword.staff_id,
              name: dbPassword.staff_name,
              email: dbPassword.email,
              role: dbPassword.role,
              hospitalId: dbPassword.hospital_id,
              hospitalName: dbPassword.hospital_name,
              specialization: dbPassword.specialization
            }
          }
        }
      }
      
      logger.warn('StaffAuth', 'Invalid staff password attempt', { 
        passwordPrefix: password.substring(0, 2) + '***' 
      })
      return { success: false, error: 'Parolă invalidă' }
      
    } catch (error) {
      logger.error('StaffAuth', 'Staff authentication failed', error)
      return { success: false, error: 'Eroare la autentificare' }
    }
  }
  
  /**
   * Generate a new password for a staff member
   */
  async generatePasswordForStaff(staffId: number): Promise<string | null> {
    try {
      // Get staff details
      const staff = await sql`
        SELECT s.id, s.name, s.hospital_id, h.name as hospital_name
        FROM staff s
        JOIN hospitals h ON s.hospital_id = h.id
        WHERE s.id = ${staffId} AND s.is_active = true
      `
      
      if (staff.length === 0) {
        logger.error('StaffAuth', 'Staff member not found', { staffId })
        return null
      }
      
      const member = staff[0]
      
      // Get existing passwords for this hospital to avoid conflicts
      const existingPasswords = await sql`
        SELECT password_plain 
        FROM staff_passwords 
        WHERE hospital_id = ${member.hospital_id} AND is_active = true
      `
      
      const usedPasswords = new Set(existingPasswords.map(p => p.password_plain))
      
      // Generate unique password
      const password = this.generateUniquePassword(member.name, member.hospital_id, usedPasswords)
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Update or insert password
      await sql`
        INSERT INTO staff_passwords (staff_id, password_hash, password_plain, hospital_id, is_active)
        VALUES (${staffId}, ${hashedPassword}, ${password}, ${member.hospital_id}, true)
        ON CONFLICT (staff_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          password_plain = EXCLUDED.password_plain,
          updated_at = CURRENT_TIMESTAMP
      `
      
      logger.info('StaffAuth', 'Generated new password for staff', {
        staffId,
        staffName: member.name,
        hospitalId: member.hospital_id
      })
      
      return password
      
    } catch (error) {
      logger.error('StaffAuth', 'Failed to generate staff password', error)
      return null
    }
  }
  
  /**
   * List all staff passwords for a hospital (for manager interface)
   */
  async getHospitalStaffPasswords(hospitalId: number): Promise<StaffPasswordData[]> {
    try {
      const passwords = await sql`
        SELECT 
          sp.id,
          sp.staff_id,
          sp.password_plain,
          sp.hospital_id,
          sp.is_active,
          sp.created_at,
          s.name as staff_name,
          s.role,
          s.specialization,
          h.name as hospital_name
        FROM staff_passwords sp
        JOIN staff s ON sp.staff_id = s.id
        JOIN hospitals h ON sp.hospital_id = h.id
        WHERE sp.hospital_id = ${hospitalId}
        AND s.is_active = true
        ORDER BY s.name
      `
      
      return passwords.map(p => ({
        id: p.id.toString(),
        staffId: p.staff_id,
        staffName: p.staff_name,
        password: p.password_plain,
        hospitalId: p.hospital_id,
        hospitalName: p.hospital_name,
        role: p.role,
        specialization: p.specialization,
        isActive: p.is_active,
        createdAt: p.created_at
      }))
      
    } catch (error) {
      logger.error('StaffAuth', 'Failed to get hospital staff passwords', error)
      return []
    }
  }
  
  /**
   * Deactivate a staff password
   */
  async deactivateStaffPassword(staffId: number): Promise<boolean> {
    try {
      await sql`
        UPDATE staff_passwords 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE staff_id = ${staffId}
      `
      
      logger.info('StaffAuth', 'Staff password deactivated', { staffId })
      return true
      
    } catch (error) {
      logger.error('StaffAuth', 'Failed to deactivate staff password', error)
      return false
    }
  }
  
  private generateUniquePassword(staffName: string, hospitalId: number, usedPasswords: Set<string>): string {
    // Extract initials from name
    const nameParts = staffName.split(' ')
    let initials = ''
    
    // Try to extract meaningful initials (skip titles)
    for (const part of nameParts) {
      if (part.length > 0 && !part.startsWith('Dr.') && !part.startsWith('Biol.') && !part.startsWith('Ch.')) {
        initials += part[0].toUpperCase()
      }
    }
    
    // Ensure we have at least 2 characters
    if (initials.length < 2) {
      initials = staffName.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
    }
    
    // Generate password: 2 initials + 1 number
    let attempts = 0
    while (attempts < 100) {
      const number = Math.floor(Math.random() * 10)
      const password = initials.substring(0, 2) + number
      
      if (!usedPasswords.has(password)) {
        return password
      }
      attempts++
    }
    
    // Fallback: use random characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let password = ''
    for (let i = 0; i < 2; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    password += Math.floor(Math.random() * 10)
    
    return password
  }
}

export const staffPasswordManager = new StaffPasswordManager()