/**
 * API Route Authentication Helper
 * Provides Supabase auth checking for API routes
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Require authentication for an API route
 * Returns the session if authenticated, or an error response if not
 */
export async function requireAuth(request?: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
      session: null,
      user: null
    };
  }

  return {
    error: null,
    session,
    user: session.user
  };
}

/**
 * Require specific role for an API route
 * Returns the session if authenticated with correct role, or an error response if not
 */
export async function requireRole(allowedRoles: string[], request?: NextRequest) {
  const authResult = await requireAuth(request);

  if (authResult.error) {
    return authResult;
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.user!.id)
    .single();

  const userRole = roleData?.role || 'guest';

  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      ),
      session: authResult.session,
      user: authResult.user
    };
  }

  return authResult;
}

/**
 * Get optional auth (don't fail if not authenticated)
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export async function getOptionalAuth(request?: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return {
    session,
    user: session?.user || null
  };
}
