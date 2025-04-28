import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code);
      
      // Redirect to dashboard or original intended URL
      const returnScript = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=/dashboard" />
          <script>
            // Try to get intended URL from localStorage
            const redirectUrl = localStorage.getItem('authRedirectUrl') || '/dashboard';
            localStorage.removeItem('authRedirectUrl');
            
            // Redirect to the intended URL
            window.location.href = redirectUrl;
          </script>
        </head>
        <body>
          <p>Signing you in...</p>
        </body>
      </html>
      `;
      
      return new NextResponse(returnScript, {
        headers: { 'Content-Type': 'text/html' },
      });
      
    } catch (error) {
      console.error('Error during auth callback:', error);
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
  }
  
  // No code? Redirect to sign-in
  return NextResponse.redirect(new URL('/auth/sign-in', request.url));
} 