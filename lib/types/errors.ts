/**
 * Error types for better error handling
 * Replaces dangerous 'any' error types
 */

export interface ApiError extends Error {
  status?: number
  code?: string
  details?: Record<string, unknown>
}

export interface DatabaseError extends Error {
  query?: string
  parameters?: unknown[]
  constraint?: string
}

export interface NetworkError extends Error {
  url?: string
  method?: string
  timeout?: boolean
}

export interface ValidationError extends Error {
  field?: string
  value?: unknown
  rule?: string
}

export type AppError = ApiError | DatabaseError | NetworkError | ValidationError

// Type guards for error types
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'query' in error
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && 'url' in error
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof Error && 'field' in error
}

// Safe error message extraction
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unknown error occurred'
}

// Safe error status extraction
export function getErrorStatus(error: unknown): number {
  if (isApiError(error) && error.status) {
    return error.status
  }
  
  return 500
}