import { sql } from './db'

/**
 * Generate a unique 3-character access code for staff
 * Format: 2 letters (initials) + 1 random number
 * Example: "JS5" for "John Smith"
 */
export async function generateUniqueAccessCode(fullName: string): Promise<string> {
  // Extract initials from name
  const nameParts = fullName.trim().split(/\s+/)
  let initials = ''
  
  if (nameParts.length >= 2) {
    // First letter of first name + first letter of last name
    initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
  } else if (nameParts.length === 1) {
    // Single name: use first two letters
    const name = nameParts[0]
    initials = name.length >= 2 ? name.substring(0, 2).toUpperCase() : name[0].toUpperCase() + 'X'
  } else {
    // Fallback
    initials = 'XX'
  }
  
  // Ensure initials are exactly 2 characters
  if (initials.length < 2) {
    initials = initials.padEnd(2, 'X')
  } else if (initials.length > 2) {
    initials = initials.substring(0, 2)
  }
  
  // Generate unique code with random number
  let accessCode = ''
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 10) // 0-9
    accessCode = initials + randomNum
    
    // Check if this code already exists
    const existing = await sql`
      SELECT id FROM staff WHERE access_code = ${accessCode} LIMIT 1
    `
    
    if (existing.length === 0) {
      // Code is unique
      return accessCode
    }
    
    attempts++
  }
  
  // If we couldn't generate a unique code with initials, 
  // fall back to random 3-character code
  return generateRandomAccessCode()
}

/**
 * Generate a completely random 3-character access code as fallback
 */
async function generateRandomAccessCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let attempts = 0
  const maxAttempts = 1000
  
  while (attempts < maxAttempts) {
    let code = ''
    for (let i = 0; i < 3; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    
    // Check if this code already exists
    const existing = await sql`
      SELECT id FROM staff WHERE access_code = ${code} LIMIT 1
    `
    
    if (existing.length === 0) {
      return code
    }
    
    attempts++
  }
  
  throw new Error('Unable to generate unique access code after maximum attempts')
}

/**
 * Validate access code format
 */
export function isValidAccessCode(code: string): boolean {
  // Must be exactly 3 characters, alphanumeric
  return /^[A-Z0-9]{3}$/.test(code)
}