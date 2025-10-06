/**
 * Supabase Admin Authentication Helper
 * Helper functions for admin route protection with Supabase Auth
 * Replaces Next-Auth getServerSession() with Supabase Auth
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface AdminAuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'moderator' | 'user' | 'guest';
  fullName?: string;
  company?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

/**
 * Get authenticated admin user from Supabase session
 * Returns user with profile data, or null if not authenticated
 */
export async function getAdminUser(): Promise<AdminAuthUser | null> {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    // Get user profile and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company, subscription_tier, subscription_status')
      .eq('id', session.user.id)
      .single();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    return {
      id: session.user.id,
      email: session.user.email!,
      role: roleData?.role || 'user',
      fullName: profile?.full_name,
      company: profile?.company,
      subscriptionTier: profile?.subscription_tier,
      subscriptionStatus: profile?.subscription_status,
    };
  } catch (error) {
    console.error('[Admin Auth] Error getting admin user:', error);
    return null;
  }
}

/**
 * Require authentication for admin routes
 * Returns authenticated user or 401 error response
 */
export async function requireAuth(): Promise<AdminAuthUser | NextResponse> {
  const user = await getAdminUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return user;
}

/**
 * Require specific role for admin routes
 * Returns authenticated user or error response (401 or 403)
 */
export async function requireRole(
  allowedRoles: AdminAuthUser['role'][]
): Promise<AdminAuthUser | NextResponse> {
  const user = await getAdminUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Check if user has admin-level permissions
 */
export function isAdmin(user: AdminAuthUser): boolean {
  return ['super_admin', 'admin', 'manager', 'moderator'].includes(user.role);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: AdminAuthUser): boolean {
  return user.role === 'super_admin';
}

/**
 * Role hierarchy check
 * Returns true if user has sufficient role level
 */
export function hasRoleLevel(
  user: AdminAuthUser,
  requiredRole: AdminAuthUser['role']
): boolean {
  const roleHierarchy: Record<string, number> = {
    super_admin: 5,
    admin: 4,
    manager: 3,
    moderator: 3,
    user: 2,
    guest: 1,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Log admin action to activity_logs table
 */
export async function logAdminAction(params: {
  userId: string;
  action: string;
  details?: any;
  success?: boolean;
  errorMessage?: string;
}) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    await supabase.from('activity_logs').insert({
      user_id: params.userId,
      action: params.action,
      details: params.details,
      success: params.success ?? true,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('[Admin Auth] Error logging action:', error);
  }
}

/**
 * Example usage in API routes:
 *
 * ```typescript
 * import { requireAuth, requireRole, logAdminAction } from '@/lib/supabase-admin-auth';
 *
 * // Require any authenticated user
 * export async function GET() {
 *   const user = await requireAuth();
 *   if (user instanceof NextResponse) return user; // Return error if not authenticated
 *
 *   // User is authenticated, proceed with logic
 *   return NextResponse.json({ data: '...' });
 * }
 *
 * // Require specific role
 * export async function POST() {
 *   const user = await requireRole(['super_admin', 'admin']);
 *   if (user instanceof NextResponse) return user; // Return error if insufficient role
 *
 *   // User has admin role, proceed with logic
 *   await logAdminAction({
 *     userId: user.id,
 *     action: 'created_user',
 *     details: { ... }
 *   });
 *
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
