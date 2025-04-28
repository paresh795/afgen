/**
 * OpenAI API client for image generation
 */

// API constants
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/images/edits'; // Use the edits endpoint
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

import { uploadFileAdmin } from './supabase-server';

// Error handling
class OpenAiApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OpenAiApiError';
  }
}

// Types (adjust based on what we actually need from the form now)
export type OpenAiGenerationParams = {
  imageUrl: string; // Input image URL from Supabase
  name: string;
  tagline: string;
  style?: string;
  background?: string; // Note: Background might not be directly supported by /edits
  theme?: string;      // Note: Theme might not be directly supported by /edits
  accessories: string[];
  boxColor: string; // Note: Box color might not be directly supported by /edits
  specialFeatures?: string;
  size?: string; // Add size parameter (e.g., '1024x1024', '1024x1536')
  // Needed for saving the output
  userId: string;
  figureId: string;
};

export type OpenAiGenerationResult = {
  success: boolean;
  imageUrl?: string; // This will be the Supabase URL of the final image
  error?: string;
  // We might not get a generationId from this endpoint
};

/**
 * Generates an action figure image using OpenAI Edits API
 */
export async function generateActionFigure(params: OpenAiGenerationParams): Promise<OpenAiGenerationResult> {
  console.log('==== OPENAI ACTION FIGURE GENERATION (/edits) ====');
  console.log('Params received:', JSON.stringify(params, null, 2));

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set.');
    return {
      success: false,
      error: 'OpenAI API Key is not configured.',
    };
  }

  try {
    // == Step 1: Fetch the input image from Supabase URL ==
    console.log(`[OpenAI] Fetching input image from: ${params.imageUrl}`);
    const imageResponse = await fetch(params.imageUrl);
    if (!imageResponse.ok) {
      throw new OpenAiApiError(`Failed to fetch input image: ${imageResponse.statusText}`, imageResponse.status);
    }
    const imageBlob = await imageResponse.blob();
    console.log(`[OpenAI] Input image fetched successfully (${(imageBlob.size / 1024).toFixed(2)} KB)`);

    // == Step 2: Construct the detailed prompt ==
    // Emphasize visual consistency with the input photo.
    let promptText =
      `Edit the input image to create a hyper-realistic, 3D, collectible toy action figure. **Crucially, the figure's face and appearance must closely resemble the person in the original uploaded photo, maintaining visual consistency to the greatest extent possible.** ` +
      `The figure should be presented sealed inside professional toy packaging, like a clear plastic blister pack on a backing card. ` +
      `The packaging must clearly display the name "${params.name}" and the tagline "${params.tagline}". `; // Add other text fields like subtitle if needed later

    // Add accessories if provided
    if (params.accessories && params.accessories.length > 0) {
      promptText += `Include miniature representations of the following accessories, visibly displayed in the packaging: ${params.accessories.join(', ')}. `;
    }

    // Add style information if available
    if (params.style) {
      const { styles } = await import('@/lib/config/styles');
      const styleName = styles.find(s => s.id === params.style)?.name || params.style;
      promptText += `The overall style of the figure and packaging should be '${styleName}'. `;
    } else {
      promptText += `Use a default modern action figure style. `;
    }
    
    // Add theme/color information if available
    if (params.theme) {
        const { themes } = await import('@/lib/config/themes');
        const themeName = themes.find(t => t.id === params.theme)?.name || params.theme;
        promptText += `The color theme should evoke '${themeName}'. `;
    }
    if (params.boxColor) {
        promptText += `The primary color of the packaging card should be ${params.boxColor}. `;
    }

    // Add special features if provided
    if (params.specialFeatures) {
        promptText += `Incorporate these special features: ${params.specialFeatures}. `;
    }

    // Add general quality/aesthetic instructions
    promptText += `Render the entire scene with cinematic photo-realism, studio lighting, soft shadows, 4K detail, and realistic matte plastic textures appropriate for a high-quality collectible toy. `;
    
    // Add composition instruction
    promptText += `**Ensure the entire action figure and its packaging are fully visible and composed neatly within the image frame.**`;

    console.log('📝 New Prompt:', promptText);

    // == Step 3: Prepare FormData for the API request ==
    const formData = new FormData();
    formData.append('image', imageBlob, 'input_face.png'); // Send the fetched image blob
    formData.append('prompt', promptText);
    formData.append('model', 'gpt-image-1'); // Use gpt-image-1 as requested and supported by /edits
    // formData.append('model', 'dall-e-2'); // IMPORTANT: /edits only supports dall-e-2 according to base doc, gpt-image-1 might only be for /generations or needs specific setup
    // formData.append('model', 'gpt-image-1'); // Use this if confirmed /edits supports it
    formData.append('n', '1');
    formData.append('size', params.size || '1024x1024'); // Use provided size, default to 1024x1024
    // formData.append('quality', 'high'); // Only for gpt-image-1
    // formData.append('response_format', 'b64_json'); // Only needed for dall-e-2 if not default URL. gpt-image-1 always returns b64

    console.log(`[OpenAI] Requesting size: ${params.size || '1024x1024'}`);
    console.log('[OpenAI] Sending request to OpenAI /edits endpoint...');

    // == Step 4: Make the API call ==
    const apiResponse = await fetch(OPENAI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        // DO NOT set 'Content-Type': 'application/json' when sending FormData
      },
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error('[OpenAI] API Error Response:', errorBody);
      throw new OpenAiApiError(`API request failed: ${apiResponse.statusText}`, apiResponse.status);
    }

    const result = await apiResponse.json();
    console.log('[OpenAI] API Success Response (raw):', JSON.stringify(result).substring(0, 500) + '...'); // Log truncated response

    // == Step 5: Process the response (assuming dall-e-2 `url` format for now) ==
    // IMPORTANT: Adjust this based on the actual model used and its response format (url vs b64_json)
    let outputImageUrl = '';

    if (result.data && result.data[0]?.url) { // Handling DALL-E 2 URL response
      outputImageUrl = result.data[0].url;
      console.log(`[OpenAI] Received image URL from DALL-E 2: ${outputImageUrl}`);
      // Since it's a temporary URL, we need to download it and re-upload to our storage
      console.log('[OpenAI] Downloading temporary image...');
      const tempImageResponse = await fetch(outputImageUrl);
      if (!tempImageResponse.ok) {
        throw new OpenAiApiError('Failed to download temporary image from OpenAI URL');
      }
      const finalImageBlob = await tempImageResponse.blob();
      
      // == Step 6: Upload final image to Supabase ==
      const outputFilePath = `${params.userId}/${params.figureId}_openai.png`;
      console.log(`[OpenAI] Uploading final image to Supabase: ${outputFilePath}`);
      const uploadResult = await uploadFileAdmin({
        bucketName: 'figures',
        filePath: outputFilePath,
        file: finalImageBlob,
        userId: params.userId, 
      });
      console.log('[OpenAI] Upload to Supabase successful:', uploadResult.url);
      
      return {
        success: true,
        imageUrl: uploadResult.url, // Return the permanent Supabase URL
      };
      
    } else if (result.data && result.data[0]?.b64_json) { // Handling potential Base64 response
      const b64Json = result.data[0].b64_json;
      console.log('[OpenAI] Received base64 image data.');
      
      // Decode base64 using Node.js Buffer (safer for server-side)
      console.log('[OpenAI] Decoding base64 data...');
      const imageBuffer = Buffer.from(b64Json, 'base64');
      // Convert buffer to Blob for upload
      const finalImageBlob = new Blob([imageBuffer], { type: 'image/png' }); 
      console.log(`[OpenAI] Decoded image blob created (${(finalImageBlob.size / 1024).toFixed(2)} KB)`);
      
      // == Step 6: Upload final image to Supabase ==
      const outputFilePath = `${params.userId}/${params.figureId}_openai.png`;
      console.log(`[OpenAI] Uploading final image to Supabase: ${outputFilePath}`);
      const uploadResult = await uploadFileAdmin({
        bucketName: 'figures',
        filePath: outputFilePath,
        file: finalImageBlob,
        userId: params.userId, 
      });
      console.log('[OpenAI] Upload to Supabase successful:', uploadResult.url);
      
      return {
        success: true,
        imageUrl: uploadResult.url, // Return the permanent Supabase URL
      };
    } else {
      console.error('[OpenAI] Failed to find image URL or base64 data in response:', result);
      throw new OpenAiApiError('Invalid response format from OpenAI API');
    }

  } catch (error) {
    console.error('❌ OpenAI API Generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during generation',
    };
  }
} 