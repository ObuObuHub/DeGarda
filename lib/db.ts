import { neon, neonConfig } from '@neondatabase/serverless'

// Configure neon for edge runtime
neonConfig.fetchConnectionCache = true

let dbInstance: ReturnType<typeof neon> | undefined

/**
 * Get database connection
 * This is lazily initialized to avoid build-time errors
 */
export function getDb() {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    
    // Ensure the DATABASE_URL is properly encoded
    let cleanDatabaseUrl = databaseUrl
    
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
      
      cleanDatabaseUrl = cleanUrl.toString()
    } catch (error) {
      console.error('Error processing DATABASE_URL:', error)
      // Continue with the original URL
    }
    
    dbInstance = neon(cleanDatabaseUrl)
  }
  
  return dbInstance
}

// Export a proxy that lazily initializes the connection
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop, receiver) {
    const db = getDb()
    return Reflect.get(db, prop, receiver)
  },
  apply(target, thisArg, argArray) {
    const db = getDb()
    return Reflect.apply(db as any, thisArg, argArray)
  }
})