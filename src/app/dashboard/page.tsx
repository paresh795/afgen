"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FigureCard, FigureStatus } from '@/components/FigureCard';
import { supabase, getUserFigures, getSignedUrl } from '@/lib/supabase';
import { pollFigureStatus } from '@/lib/polling';
import { toast } from 'react-hot-toast';

// Define the Figure type based on our database schema
interface Figure {
  id: string;
  user_id: string;
  prompt_json: any;
  status: FigureStatus;
  image_url: string | null;
  cost_cents: number;
  created_at: string;
}

export default function DashboardPage() {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFigures() {
      try {
        setIsLoading(true);

        console.log('[DashboardPage] Checking auth state before fetching figures...');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('[DashboardPage] Auth state check result:', { user: authData?.user?.id, email: authData?.user?.email, error: authError });

        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData?.user?.id) {
          console.error('[DashboardPage] User not authenticated, cannot load figures.');
          return;
        }

        console.log(`[DashboardPage] User authenticated (${userData.user.id}), fetching figures...`);
        const { figures, count } = await getUserFigures(userData.user.id);
        setFigures(figures);
      } catch (error) {
        console.error('Error loading figures:', error);
        toast.error('Failed to load your figures');
      } finally {
        setIsLoading(false);
      }
    }

    loadFigures();
    
    // Set up realtime subscription for figure updates
    const figuresSubscription = supabase
      .channel('public:figures')
      .on('postgres_changes', { 
        event: '*',
        schema: 'public', 
        table: 'figures' 
      }, (payload) => {
        // SUPER SIMPLE CALLBACK: Just log that *anything* was received
        console.log('[Realtime] >>> EVENT RECEIVED ON public:figures CHANNEL! <<<', payload);
        
        // Restore the actual state update logic
        // console.log('[Realtime] Callback fired!'); // Keep this commented, the log above is better
        console.log('[Realtime] Full Payload:', payload); // Keep this for now
        const updatedFigure = payload.new as Figure; // Cast payload to our Figure type
        
        if (updatedFigure) {
          console.log(`[Realtime] Processing update for figure: ${updatedFigure.id}, Status: ${updatedFigure.status}`);
          setFigures(prevFigures => {
            console.log('[Realtime] Current figures state:', prevFigures);
            const newFigures = prevFigures.map(fig => 
              fig.id === updatedFigure.id ? updatedFigure : fig
            );
            console.log('[Realtime] New figures state (before setting):', newFigures);
            return newFigures;
          });
          
          // Optional: Show toast notification based on new status
          // Check old status safely
          const oldStatus = payload.old && typeof payload.old === 'object' && 'status' in payload.old 
            ? payload.old.status 
            : null;
            
          if (updatedFigure.status === 'done' && oldStatus === 'queued') {
            toast.success('Action figure generated!');
          } else if (updatedFigure.status === 'error' && oldStatus === 'queued') {
            toast.error(`Figure generation failed: ${updatedFigure.prompt_json?.error || 'Unknown error'}`);
          }
        } else {
          // Fallback to refetch if payload.new is missing (shouldn't happen often)
          console.log('[Realtime] Payload missing updated figure, refetching all.');
          loadFigures();
        }
      })
      .subscribe((status, err) => {
        // Add callback to log subscription status
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to figures changes!');
        } else {
          console.error(`[Realtime] Subscription failed with status: ${status}`, err);
        }
      });
      
    return () => {
      // Clean up subscription when component unmounts
      supabase.removeChannel(figuresSubscription);
    };
  }, []);

  const handleDownload = async (figureId: string, imageUrl: string) => {
    console.log(`[Download] Initiated for figure ${figureId}, URL: ${imageUrl}`);
    toast.loading('Preparing download...', { id: `download-${figureId}` });

    try {
      let downloadUrl = imageUrl; 
      let filename = `action-figure-${figureId}.png`; // Default filename

      // Assume if URL contains supabase.co, it's from our storage
      if (imageUrl.includes('supabase.co')) {
        console.log('[Download] URL is from Supabase, attempting to get signed URL.');
        // Extract the path relative to the bucket (e.g., figures/userId/figureId_openai.png)
        // Find the bucket name ('figures') and get everything after it
        const bucketName = 'figures';
        const pathStartIndex = imageUrl.indexOf(`/${bucketName}/`) + `/${bucketName}/`.length;
        if (pathStartIndex > `/${bucketName}/`.length -1) {
          const storagePath = imageUrl.substring(pathStartIndex);
          console.log(`[Download] Extracted storage path: ${storagePath}`);
          const signedUrl = await getSignedUrl(storagePath);
          if (signedUrl) {
            console.log('[Download] Successfully obtained signed URL.');
            downloadUrl = signedUrl;
            // Optional: extract original filename if needed, otherwise use default
            const originalFilename = storagePath.split('/').pop();
            if (originalFilename) filename = originalFilename;
          } else {
            console.warn('[Download] Failed to get signed URL, attempting direct download.');
            toast.error('Could not generate secure link, trying direct download.', { id: `download-${figureId}` });
          }
        } else {
           console.warn('[Download] Could not extract storage path from URL:', imageUrl);
        }
      } else {
        console.log('[Download] URL is not from Supabase, using direct URL.');
      }

      // --- New Download Logic: Fetch Blob --- 
      console.log(`[Download] Fetching image data from: ${downloadUrl.substring(0, 100)}...`);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image data: ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log(`[Download] Image data fetched as blob (${(blob.size / 1024).toFixed(2)} KB)`);
      
      // Create a temporary Object URL from the blob
      const objectUrl = URL.createObjectURL(blob);
      console.log(`[Download] Created Object URL: ${objectUrl.substring(0, 100)}...`);

      // Create a temporary link and trigger download using the Object URL
      console.log(`[Download] Triggering download for Object URL with filename: ${filename}`);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename; 
      // link.target = '_blank'; // Remove target blank
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the Object URL to free up memory
      URL.revokeObjectURL(objectUrl);
      console.log('[Download] Revoked Object URL.');
      // --- End New Download Logic ---
      
      toast.success('Download started!', { id: `download-${figureId}` });
    } catch (error) {
      console.error('[Download] Error downloading figure:', error);
      toast.error(`Failed to download figure: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: `download-${figureId}` });
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Figures</h1>
        <Button asChild>
          <Link href="/dashboard/generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Figure
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary mx-auto"></div>
            <p>Loading your figures...</p>
          </div>
        </div>
      ) : figures.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mb-2 text-lg font-medium">No figures yet</h3>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">
            Create your first action figure by uploading a photo.
          </p>
          <Button asChild>
            <Link href="/dashboard/generate">
              Create Your First Figure
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {figures.map((figure) => (
            <FigureCard
              key={figure.id}
              id={figure.id}
              name={figure.prompt_json?.name || 'Action Figure'}
              tagline={figure.prompt_json?.tagline || 'No tagline'}
              imageUrl={figure.image_url || undefined}
              status={figure.status}
              createdAt={new Date(figure.created_at)}
              onDownload={() => figure.image_url && handleDownload(figure.id, figure.image_url)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 