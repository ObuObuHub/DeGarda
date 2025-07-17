import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// Ensure JWT_SECRET is properly configured in production
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  console.warn('⚠️  Using development JWT secret. This is insecure for production!')
}

const jwtSecret = JWT_SECRET || 'dev-secret-key-unsafe-for-production'

export interface TokenPayload {
  id: number
  email: string
  role: string
  hospitalId?: number
  hospitalName?: string
  name?: string
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret) as TokenPayload
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}