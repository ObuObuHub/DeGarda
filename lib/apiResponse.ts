import { NextResponse } from 'next/server'

/**
 * Standardized API response format for DeGarda
 * 
 * All API endpoints should use these utilities to ensure consistent responses
 */

export interface ApiResponse<T = any> {
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

/**
 * Success response with data
 */
export function apiSuccess<T>(data: T, message?: string, meta?: Record<string, any>): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta })
  }
  return NextResponse.json(response)
}

/**
 * Success response with paginated data
 */
export function apiSuccessWithPagination<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  },
  message?: string,
  meta?: Record<string, any>
): NextResponse {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination,
    ...(message && { message }),
    ...(meta && { meta })
  }
  return NextResponse.json(response)
}

/**
 * Error response
 */
export function apiError(
  error: string,
  status: number = 400,
  meta?: Record<string, any>
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    ...(meta && { meta })
  }
  return NextResponse.json(response, { status })
}

/**
 * Validation error response
 */
export function apiValidationError(
  message: string,
  errors?: Record<string, string[]>
): NextResponse {
  return apiError(message, 400, { validationErrors: errors })
}

/**
 * Not found error response
 */
export function apiNotFound(resource: string): NextResponse {
  return apiError(`${resource} not found`, 404)
}

/**
 * Unauthorized error response
 */
export function apiUnauthorized(message: string = 'Unauthorized'): NextResponse {
  return apiError(message, 401)
}

/**
 * Forbidden error response
 */
export function apiForbidden(message: string = 'Forbidden'): NextResponse {
  return apiError(message, 403)
}

/**
 * Server error response
 */
export function apiServerError(message: string = 'Internal server error'): NextResponse {
  return apiError(message, 500)
}

/**
 * Success response for operations that don't return data
 */
export function apiOperationSuccess(message: string, meta?: Record<string, any>): NextResponse {
  const response: ApiResponse = {
    success: true,
    message,
    ...(meta && { meta })
  }
  return NextResponse.json(response)
}

/**
 * Helper for wrapping try-catch blocks with consistent error handling
 */
export async function withApiErrorHandling<T>(
  operation: () => Promise<NextResponse>,
  context: string
): Promise<NextResponse> {
  try {
    return await operation()
  } catch (error) {
    console.error(`API Error in ${context}:`, error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return apiNotFound(context)
      }
      if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return apiForbidden()
      }
    }
    
    return apiServerError(`Failed to process ${context}`)
  }
}