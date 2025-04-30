import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin, ensureUserCredits } from '@/lib/supabase-server';
import { enqueueFigureGeneration } from '@/lib/qstash';

export async function POST(request: NextRequest) {
  try {
    // Create a new cookie store for this request
    const cookieStore = cookies();
    
    // Debug cookie information
    const allCookies = cookieStore.getAll();
    console.log(`[Enqueue] API called with ${allCookies.length} cookies`);
    
    // Initialize Supabase client with the cookie store
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Try to get the user ID via cookie auth first
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    // First attempt: Try cookie authentication (existing method)
    const { data: { session }/*, error: sessionError */ } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Cookie auth worked! Use this user ID
      userId = session.user.id;
      userEmail = session.user.email;
      console.log(`[Enqueue] ✅ Successfully authenticated via cookies: ${userEmail}`);
    } else {
      console.log('[Enqueue] No session from cookies, trying token authentication');
      
      // Clone request for body parsing (since request body can only be read once)
      const clonedRequest = request.clone();
      
      // Try to get access_token from the request body
      try {
        const body = await clonedRequest.json();
        const accessToken = body.access_token;
        
        if (accessToken) {
          console.log('[Enqueue] Found access_token in request body, verifying');
          
          // Verify the token with Supabase
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          
          if (error) {
            console.error('[Enqueue] Token auth error:', error);
          } else if (user) {
            userId = user.id;
            userEmail = user.email;
            console.log(`[Enqueue] ✅ Successfully authenticated via token: ${userEmail}`);
          }
        }
      } catch (error: unknown) {
        console.error('[Enqueue] Error parsing request body for token:', error);
      }
    }
    
    // If we still don't have a user ID, authentication failed
    if (!userId) {
      console.log('[Enqueue] ❌ Authentication failed via both cookies and token');
      return NextResponse.json({ 
        error: 'Unauthorized. Please sign in and try again.',
        details: 'Authentication required to enqueue figure generation' 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    // Only extract fields we now need + size
    const { name, tagline, imageUrl, style, accessories, size } = body;
    
    // Validate required fields
    if (!name || !tagline || !imageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Ensure user has a credits record and get their balance
    // For new users or users without credits, we initialize with 2 credits for testing
    const credits = await ensureUserCredits(userId, 2);
    console.log(`[Enqueue] User ${userId} has ${credits} credits after ensuring record exists`);
    
    // Now check if they have enough credits to generate a figure
    if (credits < 1) {
      return NextResponse.json({ 
        error: 'Insufficient credits', 
        details: 'You need at least 1 credit to generate a figure. Please purchase credits.',
        currentCredits: credits
      }, { status: 403 });
    }
    
    console.log(`[Enqueue] User ${userId} has ${credits} credits, proceeding with generation`);

    // Create the generation parameters - simplified
    const generationParams = {
      imageUrl,
      name,
      tagline,
      style,
      accessories: accessories || [],
      size: size || '1024x1536', // Ensure size is always passed, default to portrait
    };
    
    // Store the prompt in JSON format - simplified
    const promptJson = {
      ...generationParams,
      userId
    };
    
    // Create a record in the figures table with 'queued' status
    const { data: figure, error: figureError } = await supabaseAdmin
      .from('figures')
      .insert({
        user_id: userId,
        prompt_json: promptJson,
        status: 'queued',
        cost_cents: 199, // Default cost is 1.99 USD = 199 cents
        // We'll set image_url once the generation is complete
      })
      .select()
      .single();
    
    if (figureError) {
      console.error('[Enqueue] Error creating figure record:', figureError);
      return NextResponse.json({ error: 'Failed to create figure record' }, { status: 500 });
    }
    
    // Deduct credit from user
    const { error: creditError } = await supabaseAdmin
      .from('credits')
      .update({
        balance: credits - 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (creditError) {
      console.error('[Enqueue] Error deducting credit:', creditError);
      // We'll still proceed with the generation even if credit deduction fails temporarily
      // A background job could reconcile this later
    }
    
    // Enqueue the job to QStash
    try {
      const messageId = await enqueueFigureGeneration(generationParams, figure.id);
      
      // Update the figure record with the QStash message ID for tracking
      const { error: updateError } = await supabaseAdmin
        .from('figures')
        .update({
          prompt_json: {
            ...promptJson,
            qstashMessageId: messageId
          }
        })
        .eq('id', figure.id);
      
      if (updateError) {
        console.error('[Enqueue] Error updating figure with QStash message ID:', updateError);
      }
      
      // Return success response with figure ID
      return NextResponse.json({
        success: true,
        figureId: figure.id,
        message: 'Figure generation has been queued successfully',
        qstashMessageId: messageId
      });
      
    } catch (qstashError: any) {
      console.error('[Enqueue] QStash error:', qstashError);
      
      // Update figure status to error
      await supabaseAdmin
        .from('figures')
        .update({
          status: 'error',
          prompt_json: {
            ...promptJson,
            error: `Failed to enqueue job: ${qstashError.message}`
          }
        })
        .eq('id', figure.id);
      
      return NextResponse.json({
        error: 'Failed to enqueue job to processing queue',
        details: qstashError.message,
        figureId: figure.id
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('[Enqueue] Unexpected error:', error);
    return NextResponse.json({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 