import { neon, NeonQueryFunction } from '@neondatabase/serverless'

// During build time, we might not have DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:pass@host/db'

// Create a wrapper that ensures consistent array results
function createSqlWrapper(sql: NeonQueryFunction<false, false>) {
  return new Proxy(sql, {
    async apply(target, thisArg, argArray) {
      // If DATABASE_URL wasn't set properly, throw error at runtime
      if (databaseUrl === 'postgresql://user:pass@host/db' && process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is not configured')
      }
      
      const result = await Reflect.apply(target, thisArg, argArray)
      
      // Ensure result is always an array for consistency
      if (Array.isArray(result)) {
        return result
      }
      
      // Handle other neon result types
      if (result && typeof result === 'object' && 'rows' in result) {
        return result.rows || []
      }
      
      return []
    }
  }) as NeonQueryFunction<false, false>
}

// Process the database URL
let cleanDatabaseUrl = databaseUrl

try {
  if (databaseUrl !== 'postgresql://user:pass@host/db') {
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
  }
} catch (error) {
  console.error('Error processing DATABASE_URL:', error)
  // Continue with the original URL
}

const neonSql = neon(cleanDatabaseUrl)
export const sql = createSqlWrapper(neonSql)