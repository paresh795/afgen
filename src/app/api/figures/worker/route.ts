import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { generateActionFigure, OpenAiGenerationParams } from '@/lib/openai';
import { headers } from 'next/headers';

// QStash signature verification for Next.js App Router
async function verifyQStashSignature(request: Request) {
  const signature = headers().get('upstash-signature') || '';
  const body = await request.text();
  
  // In a production app, you would use a proper verification here
  // For now we'll log but continue (development mode convenience)
  console.log('[QStash] Request signature:', signature.substring(0, 20) + '...');
  
  if (!signature && process.env.NODE_ENV === 'production') {
    throw new Error('Missing QStash signature');
  }
  
  // In production, you'd verify with something like:
  // const isValid = await verifySignature({
  //   signature,
  //   body,
  //   currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  //   nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  // });
  
  // Return the parsed body
  return JSON.parse(body);
}

export async function POST(request: NextRequest) {
  console.log('[Worker] Received figure generation job');
  
  let figureId: string | null = null; // Keep track of figureId for error handling
  
  try {
    // Verify and parse the request body
    const body = process.env.NODE_ENV === 'development' 
      ? await request.json() 
      : await verifyQStashSignature(request.clone());
    
    // Extract figureId first for potential error handling
    figureId = body.figureId || null;
    
    if (!figureId) {
      console.error('[Worker] Missing figure ID in job payload');
      return NextResponse.json({ error: 'Missing figure ID' }, { status: 400 });
    }
    
    console.log(`[Worker] Processing generation for figure ${figureId}`);
    
    // First, check if this figure exists and is still in 'queued' status
    const { data: figure, error: fetchError } = await supabaseAdmin
      .from('figures')
      .select('*')
      .eq('id', figureId)
      .single();
    
    if (fetchError || !figure) {
      console.error('[Worker] Figure not found:', fetchError);
      return NextResponse.json({ error: 'Figure not found' }, { status: 404 });
    }
    
    if (figure.status !== 'queued') {
      console.log(`[Worker] Figure ${figureId} is already in ${figure.status} status, skipping`);
      return NextResponse.json({ 
        message: `Figure is already in ${figure.status} status`,
        figureId 
      });
    }
    
    // Update the figure status to processing (this is an intermediate status we use internally)
    const { error: updateError } = await supabaseAdmin
      .from('figures')
      .update({
        prompt_json: {
          ...figure.prompt_json,
          processingStartedAt: new Date().toISOString()
        }
      })
      .eq('id', figureId);
    
    if (updateError) {
      console.error('[Worker] Error updating figure to processing status:', updateError);
      // Continue anyway, this is not critical
    }
    
    // Prepare parameters for the OpenAI function - simplified
    const generationParams: OpenAiGenerationParams = {
      imageUrl: body.imageUrl,
      name: body.name,
      tagline: body.tagline,
      style: body.style,
      accessories: body.accessories || [],
      size: body.size || '1024x1536', // Use the size from the payload, default portrait
      userId: figure.user_id, // Get userId from the figure record
      figureId: figure.id,     // Pass figureId
    };
    
    // Call the OpenAI API to generate the action figure
    console.log('[Worker] Calling OpenAI API for figure generation');
    const generationResult = await generateActionFigure(generationParams);
    
    console.log('[Worker] OpenAI API generation result:', generationResult);
    
    if (!generationResult.success || !generationResult.imageUrl) {
      // Update the figure status to error
      await supabaseAdmin
        .from('figures')
        .update({
          status: 'error',
          prompt_json: {
            ...figure.prompt_json,
            error: generationResult.error || 'Unknown error during generation',
            processingCompletedAt: new Date().toISOString()
          }
        })
        .eq('id', figureId);
      
      console.error(`[Worker] Figure generation failed: ${generationResult.error}`);
      return NextResponse.json({ 
        error: 'Figure generation failed', 
        details: generationResult.error,
        figureId 
      }, { status: 500 });
    }
    
    // Update the figure with the generated image URL (Supabase URL) and set status to 'done'
    const { error: finalUpdateError } = await supabaseAdmin
      .from('figures')
      .update({
        status: 'done',
        image_url: generationResult.imageUrl, // This is now the Supabase URL
        prompt_json: {
          ...figure.prompt_json,
          // We don't get a generationId from OpenAI /edits endpoint typically
          processingCompletedAt: new Date().toISOString()
        }
      })
      .eq('id', figureId);
    
    if (finalUpdateError) {
      console.error('[Worker] Error updating figure with generation result:', finalUpdateError);
      // Even if DB update fails, the image was generated and uploaded. Return success but log error.
      return NextResponse.json({ 
        error: 'Figure was generated but final database update failed',
        details: finalUpdateError.message,
        figureId 
      }, { status: 500 }); // Or maybe 207 Multi-Status?
    }
    
    console.log(`[Worker] Figure ${figureId} successfully generated and updated with OpenAI`);
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Figure generation completed successfully using OpenAI',
      figureId,
      imageUrl: generationResult.imageUrl
    });
    
  } catch (error: any) {
    console.error('[Worker] Unexpected error:', error);
    
    // Try to update the figure status to error if we have a figure ID
    if (figureId) {
      try {
        await supabaseAdmin
          .from('figures')
          .update({
            status: 'error',
            prompt_json: {
              error: `Worker error: ${error.message}`,
              processingCompletedAt: new Date().toISOString()
            }
          })
          .eq('id', figureId);
      } catch (updateError) {
        console.error('[Worker] Error updating figure status after error:', updateError);
      }
    }
    
    return NextResponse.json({ error: `Worker error: ${error.message}` }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 