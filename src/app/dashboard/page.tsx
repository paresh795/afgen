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
  const [activePolls, setActivePolls] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadFigures() {
      try {
        setIsLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData?.user?.id) {
          console.error('User not authenticated');
          return;
        }

        const { figures, count } = await getUserFigures(userData.user.id);
        setFigures(figures);
        
        // Start polling for any queued figures
        const queuedFigures = figures.filter(fig => fig.status === 'queued');
        if (queuedFigures.length > 0) {
          console.log(`Found ${queuedFigures.length} queued figures, starting polling`);
          queuedFigures.forEach(figure => {
            startPollingFigure(figure.id);
          });
        }
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
      .channel('figures-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'figures' 
      }, (payload) => {
        // When a figure is updated, refresh our data
        console.log('Figure updated via realtime:', payload);
        loadFigures();
      })
      .subscribe();
      
    return () => {
      // Clean up subscription when component unmounts
      supabase.removeChannel(figuresSubscription);
    };
  }, []);

  // Function to start polling a specific figure
  const startPollingFigure = (figureId: string) => {
    if (activePolls.has(figureId)) {
      return; // Already polling this figure
    }
    
    console.log(`Starting to poll figure ${figureId}`);
    
    // Add to active polls set
    setActivePolls(prev => new Set(prev).add(figureId));
    
    // Start polling
    pollFigureStatus(figureId, (result) => {
      // This callback runs on each poll
      console.log(`Poll update for figure ${figureId}:`, result);
      
      if (result.success && result.figure) {
        // Update the figure in our local state
        setFigures(prevFigures => 
          prevFigures.map(fig => 
            fig.id === figureId 
              ? { ...fig, status: result.figure.status, image_url: result.figure.image_url } 
              : fig
          )
        );
        
        // If status is no longer queued, stop polling
        if (result.figure.status !== 'queued') {
          console.log(`Figure ${figureId} is now ${result.figure.status}, stopping polling`);
          setActivePolls(prev => {
            const newSet = new Set(prev);
            newSet.delete(figureId);
            return newSet;
          });
          
          // Show a toast notification
          if (result.figure.status === 'done') {
            toast.success('Your action figure has been generated!');
          } else if (result.figure.status === 'error') {
            toast.error(`Figure generation failed: ${result.figure.error || 'Unknown error'}`);
          }
        }
      }
    }).catch(error => {
      console.error(`Polling error for figure ${figureId}:`, error);
      // Stop polling this figure on error
      setActivePolls(prev => {
        const newSet = new Set(prev);
        newSet.delete(figureId);
        return newSet;
      });
    });
  };

  const handleDownload = async (figureId: string, imageUrl: string) => {
    try {
      // For images hosted on external services, we can directly use the URL
      // For Supabase Storage, we would need to get a signed URL
      let downloadUrl = imageUrl;
      
      // If the image is stored in Supabase Storage, get a signed URL
      if (imageUrl.includes('supabase')) {
        const path = imageUrl.split('/').slice(-2).join('/'); // Extract path like "figures/123.png"
        const signedUrl = await getSignedUrl(path);
        if (signedUrl) {
          downloadUrl = signedUrl;
        }
      }

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `action-figure-${figureId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading figure:', error);
      toast.error('Failed to download figure');
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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