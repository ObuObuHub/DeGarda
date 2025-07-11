import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Ensure the DATABASE_URL is properly encoded
// This fixes issues with special characters in passwords or connection strings
let databaseUrl = process.env.DATABASE_URL

// Remove any non-ASCII characters from the connection string if they're causing issues
// This is a temporary fix for the ByteString conversion error
try {
  // Check if the URL contains non-ASCII characters
  if (!/^[\x00-\x7F]*$/.test(databaseUrl)) {
    console.warn('DATABASE_URL contains non-ASCII characters. Please ensure special characters in passwords are URL-encoded.')
  }
  
  // Try to parse and validate the URL
  const url = new URL(databaseUrl)
  
  // Ensure all parts of the URL are properly encoded
  const cleanUrl = new URL(url.protocol + '//' + 
    (url.username ? encodeURIComponent(url.username) : '') +
    (url.password ? ':' + encodeURIComponent(url.password) : '') +
    (url.username || url.password ? '@' : '') +
    url.host + 
    url.pathname + 
    url.search
  )
  
  databaseUrl = cleanUrl.toString()
} catch (error) {
  console.error('Error processing DATABASE_URL:', error)
  console.error('Please check your DATABASE_URL in .env.local')
  // Continue with the original URL
}

export const sql = neon(databaseUrl)