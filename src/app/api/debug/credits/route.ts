import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-server';

// Debug-only handler for testing credit functionality
// Should be disabled or protected in production
export async function POST(request: NextRequest) {
  console.log('[DEBUG CREDITS] Starting debug credits endpoint');
  
  try {
    // Only enable in development environment as a safeguard
    if (process.env.NODE_ENV !== 'development') {
      console.log('[DEBUG CREDITS] Rejecting - not in development mode');
      return NextResponse.json(
        { error: 'Debug endpoints disabled in production' },
        { status: 403 }
      );
    }
    
    // Log headers for debug
    console.log('[DEBUG CREDITS] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get authentication token from authorization header
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    console.log('[DEBUG CREDITS] Auth header:', authHeader ? `Present (starts with ${authHeader.substring(0, 10)}...)` : 'Not present');
    
    // Use cookies for server-side auth
    const cookieStore = cookies();
    console.log('[DEBUG CREDITS] Cookies present:', cookieStore.getAll().map(c => c.name));
    
    // First attempt: Try token from Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        console.log('[DEBUG CREDITS] Attempting to authenticate with Bearer token');
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
          console.log(`[DEBUG CREDITS] Auth success via Bearer token: ${userId}`);
        } else {
          console.log('[DEBUG CREDITS] Bearer token auth failed:', error);
        }
      } catch (error) {
        console.log('[DEBUG CREDITS] Token auth error:', error);
      }
    }
    
    // Second attempt: Try route handler client with cookies
    if (!userId) {
      console.log('[DEBUG CREDITS] Attempting to authenticate with cookie session');
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user) {
        userId = session.user.id;
        console.log(`[DEBUG CREDITS] Auth success via cookies: ${userId}`);
      } else {
        console.log('[DEBUG CREDITS] Cookie auth failed:', error || 'No session found');
      }
    }
    
    // If still not authenticated, return error
    if (!userId) {
      console.error('[DEBUG CREDITS] Authentication failed, no valid session found');
      return NextResponse.json(
        { error: 'You must be signed in to complete this action.' },
        { status: 401 }
      );
    }
    
    // Get request data
    const requestData = await request.json();
    const { action, amount = 0 } = requestData;
    
    console.log(`[DEBUG CREDITS] Requested action: ${action}, amount: ${amount}`);
    
    if (!action || !['add', 'set', 'clear'].includes(action)) {
      console.log(`[DEBUG CREDITS] Invalid action: ${action}`);
      return NextResponse.json(
        { error: 'Invalid action. Use "add", "set", or "clear".' },
        { status: 400 }
      );
    }
    
    // Get current credits
    console.log(`[DEBUG CREDITS] Fetching current credits for user ${userId}`);
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (creditsError) {
      console.error('[DEBUG CREDITS] Error fetching user credits:', creditsError);
      
      // If no row found, we should create one
      if (creditsError.message.includes('No rows found')) {
        console.log('[DEBUG CREDITS] No credits record found, will create one');
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch current credits' },
          { status: 500 }
        );
      }
    }
    
    const currentBalance = creditsData?.balance || 0;
    let newBalance = currentBalance;
    
    console.log(`[DEBUG CREDITS] Current balance: ${currentBalance}`);
    
    // Perform the requested action
    switch (action) {
      case 'add':
        newBalance = currentBalance + amount;
        break;
      case 'set':
        newBalance = amount;
        break;
      case 'clear':
        newBalance = 0;
        break;
    }
    
    console.log(`[DEBUG CREDITS] New balance will be: ${newBalance}`);
    
    // Update credits
    console.log(`[DEBUG CREDITS] Updating credits record`);
    const { error: updateError } = await supabaseAdmin
      .from('credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });
      
    if (updateError) {
      console.error('[DEBUG CREDITS] Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }
    
    console.log(`[DEBUG CREDITS] Credits updated successfully: ${currentBalance} → ${newBalance}`);
    
    return NextResponse.json({
      success: true,
      message: `Credits ${action === 'add' ? 'added' : action === 'set' ? 'set' : 'cleared'} successfully`,
      previousBalance: currentBalance,
      newBalance,
    });
    
  } catch (error: any) {
    console.error('[DEBUG CREDITS] Unexpected error:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 