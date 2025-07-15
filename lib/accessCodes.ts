/**
 * Access Code Authentication System for DeGarda
 * Implements single-field access codes per hospital with role determination
 */

import { sql } from './db'
import { logger } from './logger'
import bcrypt from 'bcryptjs'

export interface AccessCodeData {
  id: string
  code: string
  hospitalId: number
  role: 'staff' | 'manager'
  staffId?: number
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export interface AuthResult {
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

export class AccessCodeManager {
  
  /**
   * Generate a new access code for a hospital/role combination
   */
  async generateAccessCode(
    hospitalId: number, 
    role: 'staff' | 'manager',
    staffId?: number,
    expiresInDays: number = 30
  ): Promise<string> {
    try {
      // Generate simple codes based on role
      let accessCode: string
      
      if (role === 'staff') {
        // Staff: 2 letters + 1 number (e.g., "gt5", "md2")
        const letters = String.fromCharCode(97 + Math.floor(Math.random() * 26)) + 
                       String.fromCharCode(97 + Math.floor(Math.random() * 26))
        const number = Math.floor(Math.random() * 10)
        accessCode = `${letters}${number}`
      } else {
        // Manager: 6 character alphanumeric (e.g., "a7k9m3")
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        accessCode = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      }
      
      // Hash the code for database storage
      const hashedCode = await bcrypt.hash(accessCode, 10)
      
      // Set expiration
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
      
      // Store in database
      await sql`
        INSERT INTO access_codes (code_hash, hospital_id, role, staff_id, expires_at, is_active)
        VALUES (${hashedCode}, ${hospitalId}, ${role}, ${staffId || null}, ${expiresAt.toISOString()}, true)
      `
      
      logger.info('AccessCodes', 'Access code generated', {
        hospitalId,
        role,
        staffId,
        expiresInDays
      })
      
      return accessCode
    } catch (error) {
      logger.error('AccessCodes', 'Failed to generate access code', error)
      throw error
    }
  }
  
  /**
   * Authenticate using an access code
   */
  async authenticateWithCode(accessCode: string): Promise<AuthResult> {
    try {
      if (!accessCode || accessCode.trim() === '') {
        return { success: false, error: 'Cod de acces necesar' }
      }
      
      // Get all active access codes
      const codes = await sql`
        SELECT ac.*, h.name as hospital_name
        FROM access_codes ac
        JOIN hospitals h ON ac.hospital_id = h.id
        WHERE ac.is_active = true 
        AND (ac.expires_at IS NULL OR ac.expires_at > NOW())
      `
      
      // Check each code until we find a match
      for (const dbCode of codes) {
        const isMatch = await bcrypt.compare(accessCode.trim(), dbCode.code_hash)
        
        if (isMatch) {
          // If it's a staff-specific code, get staff details
          if (dbCode.staff_id) {
            const staff = await sql`
              SELECT id, name, email, role, hospital_id, specialization
              FROM staff
              WHERE id = ${dbCode.staff_id} AND is_active = true
            `
            
            if (staff.length === 0) {
              return { success: false, error: 'Membru staff inactiv' }
            }
            
            const user = staff[0]
            return {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospitalId: user.hospital_id,
                hospitalName: dbCode.hospital_name,
                specialization: user.specialization
              }
            }
          } else {
            // Generic role-based access (manager/admin)
            // Get first active user with this role at this hospital
            const users = await sql`
              SELECT id, name, email, role, hospital_id, specialization
              FROM staff
              WHERE hospital_id = ${dbCode.hospital_id}
              AND role = ${dbCode.role}
              AND is_active = true
              ORDER BY created_at ASC
              LIMIT 1
            `
            
            if (users.length === 0) {
              return { success: false, error: 'Nu există utilizatori activi cu această rolă' }
            }
            
            const user = users[0]
            return {
              success: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hospitalId: user.hospital_id,
                hospitalName: dbCode.hospital_name,
                specialization: user.specialization
              }
            }
          }
        }
      }
      
      logger.warn('AccessCodes', 'Invalid access code attempt', { accessCode: accessCode.substring(0, 4) + '***' })
      return { success: false, error: 'Cod de acces invalid' }
      
    } catch (error) {
      logger.error('AccessCodes', 'Authentication failed', error)
      return { success: false, error: 'Eroare la autentificare' }
    }
  }
  
  /**
   * Revoke an access code
   */
  async revokeAccessCode(accessCode: string): Promise<boolean> {
    try {
      // Find and deactivate the code
      const codes = await sql`
        SELECT id, code_hash FROM access_codes WHERE is_active = true
      `
      
      for (const dbCode of codes) {
        const isMatch = await bcrypt.compare(accessCode, dbCode.code_hash)
        if (isMatch) {
          await sql`
            UPDATE access_codes 
            SET is_active = false, updated_at = NOW()
            WHERE id = ${dbCode.id}
          `
          
          logger.info('AccessCodes', 'Access code revoked', { codeId: dbCode.id })
          return true
        }
      }
      
      return false
    } catch (error) {
      logger.error('AccessCodes', 'Failed to revoke access code', error)
      return false
    }
  }
  
  /**
   * List all access codes for a hospital (for admin management)
   */
  async listHospitalCodes(hospitalId: number): Promise<AccessCodeData[]> {
    try {
      const codes = await sql`
        SELECT 
          id,
          hospital_id,
          role,
          staff_id,
          is_active,
          expires_at,
          created_at,
          s.name as staff_name
        FROM access_codes ac
        LEFT JOIN staff s ON ac.staff_id = s.id
        WHERE ac.hospital_id = ${hospitalId}
        ORDER BY ac.created_at DESC
      `
      
      return codes.map(code => ({
        id: code.id.toString(),
        code: '[HIDDEN]', // Never return actual codes
        hospitalId: code.hospital_id,
        role: code.role,
        staffId: code.staff_id,
        isActive: code.is_active,
        expiresAt: code.expires_at,
        createdAt: code.created_at,
        staffName: code.staff_name
      })) as AccessCodeData[]
      
    } catch (error) {
      logger.error('AccessCodes', 'Failed to list codes', error)
      return []
    }
  }
  
}

export const accessCodeManager = new AccessCodeManager()