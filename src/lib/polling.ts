/**
 * Utility for polling the status of a long-running operation
 */

interface PollingOptions<T> {
  // Function that performs the check and returns the latest status
  checkFn: () => Promise<T>;
  
  // Function that determines if we should stop polling based on the result
  shouldContinueFn: (result: T) => boolean;
  
  // How often to poll (in milliseconds)
  interval?: number;
  
  // How long to poll before giving up (in milliseconds)
  timeout?: number;
  
  // Optional callback that's called on each poll
  onPoll?: (result: T) => void;
}

// Define the expected structure of the figure status API response
interface FigureStatusResponse {
  success: boolean;
  figure?: {
    id: string;
    status: 'queued' | 'done' | 'error';
    image_url?: string | null;
    created_at?: string;
    name?: string;
    tagline?: string;
    error?: string | null;
  };
  error?: string;
}

/**
 * Polls a resource until a condition is met or timeout is reached
 */
export async function poll<T>({
  checkFn,
  shouldContinueFn,
  interval = 2000,
  timeout = 600000, // 10 minutes by default
  onPoll
}: PollingOptions<T>): Promise<T> {
  const startTime = Date.now();
  
  // Helper function for delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Initial check
  let result = await checkFn();
  
  // Call the onPoll callback with the initial result if provided
  if (onPoll) {
    onPoll(result);
  }
  
  // If the condition is already met, return the result immediately
  if (!shouldContinueFn(result)) {
    return result;
  }
  
  // Continue polling until the condition is met or timeout is reached
  while (shouldContinueFn(result) && Date.now() - startTime < timeout) {
    await delay(interval);
    result = await checkFn();
    
    // Call the onPoll callback with the updated result if provided
    if (onPoll) {
      onPoll(result);
    }
  }
  
  // If we're still here and the condition is still true, we timed out
  if (shouldContinueFn(result)) {
    throw new Error('Polling timed out');
  }
  
  return result;
}

/**
 * Specialized polling function for checking figure generation status
 */
export async function pollFigureStatus(figureId: string, onUpdate?: (status: FigureStatusResponse) => void) {
  try {
    return poll<FigureStatusResponse>({
      checkFn: async () => {
        const res = await fetch(`/api/figures/status/${figureId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch figure status: ${res.statusText}`);
        }
        return res.json();
      },
      shouldContinueFn: (result) => {
        return result.figure?.status === 'queued'; // Keep polling while queued
      },
      interval: 3000, // Check every 3 seconds
      timeout: 600000, // 10 minute timeout
      onPoll: onUpdate
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Polling check failed';
    console.error(message, error);
    throw error;
  }
} 