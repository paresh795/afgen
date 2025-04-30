import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileAdmin } from '@/lib/supabase-server';

// Maximum file size (8MB)
const MAX_FILE_SIZE = 8 * 1024 * 1024;
// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png'];

export async function POST(request: NextRequest) {
  try {
    // Create a new cookie store for each request
    const cookieStore = cookies();
    
    // Debug cookie information
    // const allCookies = cookieStore.getAll();
    
    // Check for specific Supabase session cookie
    // const sbSessionCookie = allCookies.find(c => c.name.includes('supabase.auth.token'));
    // console.log('Supabase auth cookie present:', !!sbSessionCookie);
    
    // Initialize Supabase client with the cookie store
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    // Try to get the user ID either via cookie auth or token auth
    let userId: string | undefined;
    // let userEmail: string | undefined;
    let formData: FormData;
    
    // First try cookie authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: 'Authentication error: ' + sessionError.message }, 
        { status: 401 }
      );
    }
    
    if (session) {
      // Cookie auth worked! Use this user ID
      userId = session.user.id;
      // userEmail = session.user.email;
      
      // Get the form data for file processing
      formData = await request.formData();
    } else {
      // No session from cookies, try fallback token authentication
      formData = await request.formData();
      const accessToken = formData.get('access_token');

      if (accessToken) {
        try {
          // Create a new supabase client with the provided token
          const { data: { user }, error } = await supabase.auth.getUser(accessToken as string);
          
          if (error) {
            console.error("Token auth error:", error);
            throw error;
          }
          
          if (user) {
            userId = user.id;
            // userEmail = user.email;
            // console.log("✅ Successfully authenticated via token:", userEmail);
          }
        } catch (error) {
          console.error("Failed to authenticate with token:", error);
        }
      }
      
      // If we still don't have a user ID, authentication failed
      if (!userId) {
        return NextResponse.json(
          { 
            error: 'Authentication required. Please log in and try again.',
            info: 'You may need to refresh the page or sign in again.',
            debug: {
              hasCookies: cookieStore.getAll().length > 0,
              cookieCount: cookieStore.getAll().length,
              hasAuthCookie: cookieStore.getAll().some(c => c.name.includes('supabase')),
              xhrCredentials: request.headers.get('cookie') ? true : false,
              hasAccessToken: !!accessToken,
            }
          }, 
          { 
            status: 401,
            headers: {
              'Cache-Control': 'no-store, max-age=0'
            }
          }
        );
      }
    }
    
    // Get the file from the form data
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please select a file.' }, 
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, 
        { status: 400 }
      );
    }
    
    // Validate file type
    const fileType = file.type;
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` }, 
        { status: 400 }
      );
    }
    
    // Generate a unique file name with user ID as folder path
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}.${fileExt}`;
    
    // Use our admin client with service role permissions to bypass RLS
    try {
      const result = await uploadFileAdmin({
        bucketName: 'figures',
        filePath: filePath,
        file: file,
        userId: userId,
      });
      
      return NextResponse.json({ 
        url: result.url,
        path: result.path,
        success: true,
        authMethod: session ? 'cookie' : 'token',
      });
    } catch (error) {
      console.error('Admin upload failed:', error);
      let errorMessage = 'File upload failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      return NextResponse.json(
        { error: 'Failed to upload file', details: errorMessage }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Upload handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return a generic message to the client in production
    const clientErrorMessage = process.env.NODE_ENV === 'production' 
      ? 'Server error processing upload' 
      : `Server error processing upload: ${errorMessage}`; // Be more verbose in dev

    return NextResponse.json(
      { error: clientErrorMessage }, 
      { status: 500 }
    );
  }
}

// Update the config for Next.js App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; 