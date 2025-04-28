import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getUserCredits } from '@/lib/supabase';

// Debug-only endpoint to check user's credits
export async function GET(request: NextRequest) {
  console.log('[DEBUG CREDITS CHECK] Starting credits check endpoint');
  
  try {
    // Only enable in development environment as a safeguard
    if (process.env.NODE_ENV !== 'development') {
      console.log('[DEBUG CREDITS CHECK] Rejecting - not in development mode');
      return NextResponse.json(
        { error: 'Debug endpoints disabled in production' },
        { status: 403 }
      );
    }
    
    // Authenticate user
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    console.log(`[DEBUG CREDITS CHECK] Request has ${allCookies.length} cookies`);
    
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Try to get the user ID via cookie auth first
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    // First attempt: Try cookie authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (session?.user) {
      userId = session.user.id;
      userEmail = session.user.email;
      console.log(`[DEBUG CREDITS CHECK] ✅ Authenticated via cookies: ${userEmail}`);
    } else {
      console.log('[DEBUG CREDITS CHECK] No session from cookies, trying Bearer token');
      
      // Try Bearer token auth
      const authHeader = request.headers.get('authorization');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          
          if (error) {
            console.error("[DEBUG CREDITS CHECK] Token auth error:", error);
          } else if (user) {
            userId = user.id;
            userEmail = user.email;
            console.log(`[DEBUG CREDITS CHECK] ✅ Authenticated via Bearer token: ${userEmail}`);
          }
        } catch (error) {
          console.error("[DEBUG CREDITS CHECK] Failed to authenticate with Bearer token:", error);
        }
      }
    }
    
    // If no authentication, return error
    if (!userId) {
      console.log('[DEBUG CREDITS CHECK] ❌ Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check user credits using the helper function
    const helperCredits = await getUserCredits(userId);
    console.log(`[DEBUG CREDITS CHECK] Credits from helper function: ${helperCredits}`);
    
    // Also check directly with the admin client
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('user_id', userId);
      
    if (creditsError) {
      console.error('[DEBUG CREDITS CHECK] Error fetching credits record:', creditsError);
    }
    
    // Check if user exists in the users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('[DEBUG CREDITS CHECK] Error fetching user record:', userError);
    }
    
    // Return detailed information
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
        exists_in_users_table: !userError && !!userData,
        user_record: userData || null,
      },
      credits: {
        helper_function_value: helperCredits,
        record_exists: !creditsError && creditsData && creditsData.length > 0,
        direct_query_result: creditsData || null,
        error: creditsError ? creditsError.message : null,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('[DEBUG CREDITS CHECK] Unexpected error:', error);
    return NextResponse.json(
      { error: `Failed to check credits: ${error.message}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 