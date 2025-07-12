/**
 * Helper to ensure SQL results are always arrays
 * Neon can return different result types depending on the query
 */
export function ensureArray<T = any>(result: any): T[] {
  if (Array.isArray(result)) {
    return result
  }
  
  // Handle other possible return types from neon
  if (result && typeof result === 'object' && 'rows' in result) {
    return result.rows || []
  }
  
  return []
}