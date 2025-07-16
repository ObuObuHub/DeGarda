/**
 * Enhanced Role-Based Access Control Middleware
 * Combines hospital isolation with role-based permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyHospitalAuth, AuthUser } from './hospitalMiddleware'
import { checkAPIPermission, UserRole } from './roleBasedAccess'
import { logger } from './logger'

export interface RoleBasedAuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Middleware that enforces both hospital isolation and role-based access control
 */
export async function withRoleBasedAuth(
  request: NextRequest,
  requiredPermissions: { method: string; route: string }[],
  handler: (authUser: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  // First verify authentication and hospital isolation
  const authResult = await verifyHospitalAuth(request)
  
  if (!authResult.success || !authResult.user) {
    logger.warn('RoleBasedAuth', 'Authentication failed', {
      url: request.url,
      error: authResult.error
    })
    
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const user = authResult.user
  const userRole = user.role as UserRole
  
  // Check role-based permissions
  const method = request.method
  const hasPermission = requiredPermissions.some(perm => 
    perm.method === method && checkAPIPermission(userRole, perm.method, perm.route)
  )
  
  if (!hasPermission) {
    logger.warn('RoleBasedAuth', 'Insufficient permissions', {
      userId: user.userId,
      role: userRole,
      method,
      url: request.url,
      requiredPermissions
    })
    
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }
  
  logger.info('RoleBasedAuth', 'Access granted', {
    userId: user.userId,
    role: userRole,
    hospitalId: user.hospitalId,
    method,
    url: request.url
  })
  
  return handler(user)
}

/**
 * Simplified middleware for single route/method combinations
 */
export async function withPermission(
  request: NextRequest,
  method: string,
  route: string,
  handler: (authUser: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRoleBasedAuth(request, [{ method, route }], handler)
}

/**
 * Create a role-based page middleware for Next.js pages
 */
export function createPageMiddleware(requiredRole: UserRole, redirectTo: string = '/admin/dashboard') {
  return function(request: NextRequest) {
    // This would be used in Next.js middleware.ts file
    // For now, we'll implement client-side checks in components
    return NextResponse.next()
  }
}