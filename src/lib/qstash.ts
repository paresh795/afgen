import { Client } from '@upstash/qstash';

// Initialize QStash client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || '',
  baseUrl: process.env.QSTASH_URL || 'https://qstash.upstash.io',
});

/**
 * Enqueues a figure generation job to QStash
 * 
 * @param payload The job payload containing generation parameters
 * @param figureId The ID of the figure record in the database
 * @returns The message ID from QStash
 */
export async function enqueueFigureGeneration(payload: Record<string, unknown>, figureId: string) {
  if (!process.env.QSTASH_TOKEN) {
    throw new Error('QStash token not configured');
  }

  // Set the callback URL to our worker endpoint
  const workerUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/figures/worker`;
  
  console.log(`[QStash] Enqueueing job for figure ${figureId} to ${workerUrl}`);

  // Additional metadata to help with job tracking
  const enrichedPayload = {
    ...payload,
    figureId,
    enqueuedAt: new Date().toISOString(),
  };

  try {
    // Send to QStash with a 5-minute delay (to allow for server processing time)
    const response = await qstashClient.publishJSON({
      url: workerUrl,
      body: enrichedPayload,
      headers: {
        'Content-Type': 'application/json',
      },
      // Set any relevant options like retries, delay, etc.
      retries: 3,
      // Each retry will be delayed by a random amount between 10 and 60 seconds
      notBefore: 0, // Send immediately
    });

    console.log(`[QStash] Job enqueued successfully: ${response.messageId}`);
    return response.messageId;
  } catch (error) {
    console.error('[QStash] Failed to enqueue job:', error);
    throw error;
  }
}

export default qstashClient; 