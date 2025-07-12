import crypto from 'crypto'

/**
 * Generate a secure random password
 * @param length Password length (default: 16)
 * @returns A secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-='
  let password = ''
  
  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-='
  
  // Add one character from each category
  password += lowercase[crypto.randomInt(lowercase.length)]
  password += uppercase[crypto.randomInt(uppercase.length)]
  password += numbers[crypto.randomInt(numbers.length)]
  password += special[crypto.randomInt(special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[crypto.randomInt(charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('')
}

/**
 * Generate a memorable password using words and numbers
 * @returns A memorable but secure password
 */
export function generateMemorablePassword(): string {
  const adjectives = [
    'Swift', 'Bright', 'Strong', 'Clear', 'Happy',
    'Noble', 'Brave', 'Quick', 'Smart', 'Kind'
  ]
  
  const nouns = [
    'Eagle', 'River', 'Mountain', 'Forest', 'Ocean',
    'Thunder', 'Phoenix', 'Dragon', 'Falcon', 'Tiger'
  ]
  
  const adjective = adjectives[crypto.randomInt(adjectives.length)]
  const noun = nouns[crypto.randomInt(nouns.length)]
  const number = crypto.randomInt(100, 999)
  const special = '!@#$%'[crypto.randomInt(5)]
  
  return `${adjective}${noun}${number}${special}`
}

/**
 * Generate a temporary password that should be changed on first login
 * @param identifier User identifier (e.g., email or name)
 * @returns A temporary password
 */
export function generateTemporaryPassword(identifier: string): string {
  // Use a more secure temporary password than just email+123
  const prefix = identifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
  const randomSuffix = crypto.randomInt(1000, 9999)
  const special = '!@#'[crypto.randomInt(3)]
  
  return `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}${special}${randomSuffix}`
}