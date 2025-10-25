/**
 * Service-to-Service Authentication
 * Allows trusted services (like Main Platform) to authenticate without user session
 */

import { NextRequest } from 'next/server';

// Service API key for internal authentication
const SERVICE_API_KEY = process.env.SPATIAL_STUDIO_SERVICE_KEY || 'spatial-studio-internal-2025';

/**
 * Check if request is from a trusted service
 * Services authenticate using X-Service-Key header
 */
export function isServiceRequest(request: NextRequest): boolean {
  // Check both lowercase and capitalized header names for compatibility
  const serviceKey = request.headers.get('x-service-key') || request.headers.get('X-Service-Key');

  if (!serviceKey) {
    return false;
  }

  // Verify the service key matches
  return serviceKey === SERVICE_API_KEY;
}

/**
 * Extract user context from service request
 * Services can pass user context via headers for RLS
 */
export function getServiceUserContext(request: NextRequest) {
  if (!isServiceRequest(request)) {
    return null;
  }

  return {
    userId: request.headers.get('x-user-id'),
    userEmail: request.headers.get('x-user-email'),
    userRole: request.headers.get('x-user-role') || 'user',
    isService: true
  };
}

/**
 * Verify request is either authenticated user or trusted service
 */
export async function requireAuthOrService(request: NextRequest) {
  // Check if it's a service request first
  if (isServiceRequest(request)) {
    return {
      authenticated: true,
      isService: true,
      context: getServiceUserContext(request)
    };
  }

  // Otherwise check for user authentication (this will be handled by existing auth)
  return {
    authenticated: false,
    isService: false,
    context: null
  };
}