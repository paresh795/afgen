import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Access cookies
    const cookieStore = cookies();
    const cookieList = cookieStore.getAll();
    console.log('Cookies present:', cookieList.map(c => c.name));
    
    // Check headers for auth
    const authHeader = request.headers.get('authorization');
    const headerAuth = {
      success: false,
      userId: null as string | null,
      message: 'No auth header'
    };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error) {
          headerAuth.message = error.message;
        } else if (user) {
          headerAuth.success = true;
          headerAuth.userId = user.id;
          headerAuth.message = 'Authenticated via header';
        }
      } catch (e: any) {
        headerAuth.message = e.message;
      }
    }
    
    // Check for session in cookies
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data, error } = await supabase.auth.getSession();
    
    // Check raw auth cookie
    const rawCookieAuth = {
      success: false,
      userId: null as string | null,
      message: 'No auth cookie'
    };
    
    const accessTokenCookie = cookieStore.get('sb-access-token');
    
    if (accessTokenCookie) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessTokenCookie.value);
        if (error) {
          rawCookieAuth.message = error.message;
        } else if (user) {
          rawCookieAuth.success = true;
          rawCookieAuth.userId = user.id;
          rawCookieAuth.message = 'Authenticated via raw cookie';
        }
      } catch (e: any) {
        rawCookieAuth.message = e.message;
      }
    }
    
    // Check request headers for debug info from middleware
    const middlewareAuthStatus = request.headers.get('x-auth-status') || 'unknown';
    const middlewareAuthUserId = request.headers.get('x-auth-user-id');
    
    // Complete diagnostic response
    return NextResponse.json({
      authenticated: !!(data?.session || headerAuth.success || rawCookieAuth.success),
      cookiesPresent: cookieList.length > 0,
      cookieNames: cookieList.map(c => c.name),
      session: data?.session ? {
        userId: data.session.user.id,
        email: data.session.user.email,
        hasAccessToken: !!data.session.access_token,
      } : null,
      error: error?.message,
      headerAuth,
      rawCookieAuth,
      middlewareInfo: {
        status: middlewareAuthStatus,
        userId: middlewareAuthUserId
      },
      serverTimeUTC: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error.message,
      serverTimeUTC: new Date().toISOString()
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 