// API client with retry logic and error handling

interface ApiOptions extends RequestInit {
  retries?: number
  retryDelay?: number
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  }

  setToken(token: string | null) {
    this.token = token
  }

  async request<T = any>(
    endpoint: string, 
    options: ApiOptions = {}
  ): Promise<T> {
    const { 
      retries = 3, 
      retryDelay = 1000,
      headers,
      ...fetchOptions 
    } = options

    const url = `${this.baseUrl}${endpoint}`
    
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>)
    }

    // No need to set Authorization header - using HTTP-only cookies

    // Retry logic
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: finalHeaders,
          credentials: 'include' // Include cookies for authentication
        })

        // Don't retry on auth errors
        if (response.status === 401 || response.status === 403) {
          const error = await response.json()
          throw new Error(error.error || `HTTP ${response.status}`)
        }

        if (!response.ok) {
          // Retry on server errors
          if (response.status >= 500 && attempt < retries - 1) {
            await this.delay(retryDelay * Math.pow(2, attempt)) // Exponential backoff
            continue
          }
          
          const error = await response.json()
          throw new Error(error.error || `HTTP ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        // Network errors - retry
        if (attempt < retries - 1 && this.isNetworkError(error)) {
          await this.delay(retryDelay * Math.pow(2, attempt))
          continue
        }
        
        throw error
      }
    }

    throw new Error('Max retries exceeded')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isNetworkError(error: any): boolean {
    return error instanceof TypeError && 
           (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError'))
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Create singleton instance
const apiClient = new ApiClient()

export default apiClient
export { apiClient }