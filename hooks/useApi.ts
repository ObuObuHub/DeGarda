import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta?: Record<string, any>
}

interface UseApiState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  success: boolean
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  logContext?: string
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    success: false
  })

  const request = useCallback(async (
    url: string,
    requestOptions: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, success: false }))

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions.headers
        },
        ...requestOptions
      })

      const result: ApiResponse<T> = await response.json()

      if (response.ok && result.success) {
        setState({
          data: result.data || null,
          isLoading: false,
          error: null,
          success: true
        })
        
        if (options.onSuccess) {
          options.onSuccess(result.data)
        }
        
        return result
      } else {
        const errorMessage = result.error || `Request failed with status ${response.status}`
        setState({
          data: null,
          isLoading: false,
          error: errorMessage,
          success: false
        })
        
        if (options.onError) {
          options.onError(errorMessage)
        }
        
        if (options.logContext) {
          logger.error(options.logContext, 'API request failed', { 
            url, 
            status: response.status, 
            error: errorMessage 
          })
        }
        
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      setState({
        data: null,
        isLoading: false,
        error: errorMessage,
        success: false
      })
      
      if (options.onError) {
        options.onError(errorMessage)
      }
      
      if (options.logContext) {
        logger.error(options.logContext, 'API request error', error)
      }
      
      throw error
    }
  }, [options])

  const get = useCallback((url: string) => {
    return request(url, { method: 'GET' })
  }, [request])

  const post = useCallback((url: string, data?: any) => {
    return request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [request])

  const put = useCallback((url: string, data?: any) => {
    return request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [request])

  const patch = useCallback((url: string, data?: any) => {
    return request(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [request])

  const del = useCallback((url: string) => {
    return request(url, { method: 'DELETE' })
  }, [request])

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      success: false
    })
  }, [])

  return {
    ...state,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    reset
  }
}

/**
 * Hook for paginated API requests
 */
export function usePaginatedApi<T = any>(options: UseApiOptions = {}) {
  const api = useApi<T[]>(options)
  const [pagination, setPagination] = useState<ApiResponse['pagination'] | null>(null)

  const requestWithPagination = useCallback(async (
    url: string,
    page: number = 1,
    limit: number = 20,
    requestOptions: RequestInit = {}
  ) => {
    const urlWithPagination = `${url}?page=${page}&limit=${limit}`
    const result = await api.request(urlWithPagination, requestOptions)
    
    if (result.success && result.pagination) {
      setPagination(result.pagination)
    }
    
    return result
  }, [api])

  return {
    ...api,
    pagination,
    requestWithPagination
  }
}