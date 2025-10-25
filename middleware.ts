import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

// Service API key for internal authentication
const SERVICE_API_KEY = process.env.SPATIAL_STUDIO_SERVICE_KEY || 'spatial-studio-internal-2025'

function isServiceRequest(request: NextRequest): boolean {
  // Check both lowercase and capitalized header names for compatibility
  const serviceKey = request.headers.get('x-service-key') || request.headers.get('X-Service-Key')
  return serviceKey === SERVICE_API_KEY
}

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Allow public access to home page
  if (pathname === '/') {
    return res
  }

  // Allow health checks and OPTIONS requests without auth
  if (request.method === 'OPTIONS' || pathname.includes('/health')) {
    return res
  }

  // Allow service-to-service requests with API key
  if (isServiceRequest(request)) {
    console.log(`Service request authenticated for ${pathname}`)
    return res
  }

  // For user requests, check Supabase auth
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

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
