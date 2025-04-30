import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function to get authenticated user
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper function for retrieving user's credits
export async function getUserCredits(userId: string) {
  console.log(`[getUserCredits] Fetching credits for userId: ${userId}`); // Log entry and userId
  try {
    // First try to get existing credits
    const { data, error } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    // Log the result
    console.log('[getUserCredits] Supabase query result:', { data, error });

    // If we found a record, return the balance
    if (!error && data) {
      console.log(`[getUserCredits] Found record. Balance: ${data.balance || 0}`);
      return data.balance || 0;
    }
    
    // If no record found or error, log it
    if (error) {
      console.error('Error fetching user credits:', error);
      
      // If the error is specifically that no rows were found, create a credits record
      if (error.code === 'PGRST116' || error.message.includes('JSON object requested')) { 
        console.log(`[getUserCredits] No credits record found for user ${userId}, creating one with default balance 0`);
        
        // Create a new credits record with 0 balance using upsert
        const { error: upsertError } = await supabase
          .from('credits')
          .upsert({
            user_id: userId,
            balance: 0,
            updated_at: new Date().toISOString(),
          });
          
        if (upsertError) {
          console.error('Failed to create credits record:', upsertError);
        } else {
          console.log('Successfully created credits record with 0 balance');
        }
      }
    }
    
    // Add additional debugging for credits record lookup
    console.log(`[getUserCredits] Returning default 0 credits for user ${userId} after checks.`); // Log default return
    return 0;
  } catch (unexpectedError) {
    // Catch any unexpected errors to ensure this function never throws
    console.error('[getUserCredits] Unexpected error:', unexpectedError);
    return 0;
  }
}

// Helper function to get user's figures
export async function getUserFigures(userId: string, page = 1, limit = 10) {
  console.log(`[getUserFigures] Fetching figures for userId: ${userId}, page: ${page}, limit: ${limit}`); // Log entry
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('figures')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  // Log the result
  console.log('[getUserFigures] Supabase query result:', { data: data ? `${data.length} figures` : null, count, error });

  if (error) {
    console.error('[getUserFigures] Error fetching user figures:', error);
    return { figures: [], count: 0 };
  }

  console.log(`[getUserFigures] Returning ${data?.length || 0} figures, total count: ${count}`);
  return { figures: data || [], count };
}

// Helper function to create a signed URL for downloading a figure
export async function getSignedUrl(path: string) {
  console.log(`[getSignedUrl] Requesting signed URL for path: ${path}`); // Log path
  const { data, error } = await supabase.storage
    .from('figures')
    .createSignedUrl(path, 3600); // 1 hour expiry

  // Log result
  console.log(`[getSignedUrl] Result:`, { signedUrl: data?.signedUrl ? data.signedUrl.substring(0, 100) + '...' : null, error });

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}

// Helper function to get user's payment history
export async function getUserPayments(userId: string, page = 1, limit = 20) {
  console.log(`[getUserPayments] Fetching payments for userId: ${userId}, page: ${page}, limit: ${limit}`);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('payments')
    .select('*', { count: 'exact' }) // Fetch all columns for now
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  console.log('[getUserPayments] Supabase query result:', { data: data ? `${data.length} payments` : null, count, error });

  if (error) {
    console.error('[getUserPayments] Error fetching user payments:', error);
    // Return empty array on error, let frontend handle display
    return { payments: [], count: 0 }; 
  }

  console.log(`[getUserPayments] Returning ${data?.length || 0} payments, total count: ${count}`);
  // Map to a slightly friendlier structure if needed, or return raw data
  // For now, return raw data, frontend can format
  return { payments: data || [], count };
} 