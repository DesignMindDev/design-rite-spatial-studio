import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Allow public access to home page
  if (request.nextUrl.pathname === '/') {
    return res
  }

  // Require authentication for all other routes
  if (!session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }

  // Check user role from user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  const userRole = roleData?.role || 'user'

  // Only allow manager+ roles to access Spatial Studio
  if (!['super_admin', 'admin', 'manager'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 })
  }

  return res
}

export const config = {
  matcher: [
    '/api/:path*',
    '/projects/:path*',
  ]
}
