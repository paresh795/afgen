import { createClient } from '@supabase/supabase-js';

// Environment variables (same as in src/lib/supabase.ts)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Make sure we have the necessary credentials
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Some server-side operations may fail.');
}

// Create a Supabase client with the service role key for server-side operations
// This client bypasses RLS policies and should ONLY be used server-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

/**
 * Uploads a file to Supabase Storage with server-side privileges
 * This bypasses RLS policies and should ONLY be used in server contexts
 */
export async function uploadFileAdmin({
  bucketName,
  filePath,
  file,
  userId,
}: {
  bucketName: string;
  filePath: string;
  file: File | Blob;
  userId: string;
}) {
  try {
    // Create the user's directory if it doesn't exist
    const { data: dirData, error: dirError } = await supabaseAdmin.storage
      .from(bucketName)
      .list(userId);
    
    console.log(`Storage admin: Checking if user directory exists: ${userId}`);
    
    // If we can't list the directory and it's not because it doesn't exist, there's an issue
    if (dirError && !dirError.message.includes('not found')) {
      throw new Error(`Failed to check user directory: ${dirError.message}`);
    }

    // Upload file using admin privileges
    console.log(`Storage admin: Uploading file to ${bucketName}/${filePath}`);
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Use upsert to overwrite if file exists
      });

    if (error) {
      console.error('Storage admin upload error:', error);
      throw error;
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Storage admin operation failed:', error);
    throw error;
  }
}

/**
 * Ensures a user has a credit record and returns their current credit balance
 * This uses the admin client and should only be called from server contexts
 */
export async function ensureUserCredits(userId: string, defaultCredits: number = 0): Promise<number> {
  try {
    console.log(`[Admin] Ensuring credits record exists for user ${userId}`);
    
    // First check if user has a credits record
    const { data, error } = await supabaseAdmin
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();
      
    // If record exists, return the balance
    if (!error && data) {
      console.log(`[Admin] User has existing credits record with balance: ${data.balance}`);
      return data.balance;
    }
    
    // If error is that no record exists, create one
    if (error && (error.code === 'PGRST116' || error.message.includes('No rows'))) {
      console.log(`[Admin] No credits record found for user ${userId}, creating one with ${defaultCredits} credits`);
      
      // Create a new credits record
      const { error: upsertError } = await supabaseAdmin
        .from('credits')
        .upsert({
          user_id: userId,
          balance: defaultCredits,
          updated_at: new Date().toISOString(),
        });
        
      if (upsertError) {
        console.error('[Admin] Failed to create credits record:', upsertError);
        return 0;
      }
      
      console.log(`[Admin] Successfully created credits record with ${defaultCredits} credits`);
      return defaultCredits;
    }
    
    // Handle other errors
    console.error('[Admin] Error checking credits record:', error);
    return 0;
  } catch (error) {
    console.error('[Admin] Unexpected error ensuring user credits:', error);
    return 0;
  }
}

/**
 * Adds credits to a user's account
 * Returns the new balance or null if the operation failed
 */
export async function addUserCredits(userId: string, amount: number): Promise<number | null> {
  try {
    if (amount <= 0) {
      console.error('[Admin] Cannot add non-positive credit amount:', amount);
      return null;
    }
    
    // First ensure user has a credits record and get current balance
    const currentBalance = await ensureUserCredits(userId, 0);
    const newBalance = currentBalance + amount;
    
    console.log(`[Admin] Adding ${amount} credits to user ${userId}. ${currentBalance} → ${newBalance}`);
    
    // Update the balance
    const { error } = await supabaseAdmin
      .from('credits')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    if (error) {
      console.error('[Admin] Failed to add credits:', error);
      return null;
    }
    
    console.log(`[Admin] Successfully updated credits to ${newBalance}`);
    return newBalance;
  } catch (error) {
    console.error('[Admin] Unexpected error adding credits:', error);
    return null;
  }
} 