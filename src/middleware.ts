import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// This middleware refreshes the user's session and redirects
// the user to the login page if their session is expired.
export async function middleware(request: NextRequest) {
  // Don't run middleware on auth pages to prevent loops
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }
  
  // Create response and supabase client
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // Refresh the auth session - but don't force redirects
  await supabase.auth.getSession();
  
  // For API routes, add helpful debug headers in development
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/api/')) {
    res.headers.set('x-middleware-cache', 'no-store');
  }
  
  // Critical: Always return the response modified by supabase
  return res;
}

// Apply middleware to all routes except static assets
// This is important for cookie handling for API routes as well
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 