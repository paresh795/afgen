import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const figureId = params.id;
    
    if (!figureId) {
      return NextResponse.json({ error: 'Missing figure ID' }, { status: 400 });
    }
    
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get the figure by ID, ensuring it belongs to the current user
    const { data: figure, error } = await supabase
      .from('figures')
      .select('*')
      .eq('id', figureId)
      .eq('user_id', userId)  // Security check: ensure figure belongs to the current user
      .single();
    
    if (error || !figure) {
      console.error(`[Status] Figure ${figureId} not found for user ${userId}:`, error);
      return NextResponse.json({ error: 'Figure not found' }, { status: 404 });
    }
    
    // Return the figure details with the current status
    return NextResponse.json({
      success: true,
      figure: {
        id: figure.id,
        status: figure.status,
        image_url: figure.image_url,
        created_at: figure.created_at,
        name: figure.prompt_json?.name || 'Action Figure',
        tagline: figure.prompt_json?.tagline || '',
        // Include error if status is 'error'
        ...(figure.status === 'error' && { error: figure.prompt_json?.error || 'Unknown error' })
      }
    });
    
  } catch (error: unknown) {
    console.error('[Status] Error fetching figure status:', error);
    return NextResponse.json({ error: `Error fetching status: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 