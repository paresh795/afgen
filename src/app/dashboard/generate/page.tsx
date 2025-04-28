"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploader } from '@/components/FileUploader';
import { supabase } from '@/lib/supabase';
import { styles } from '@/lib/config/styles';
import { backgrounds } from '@/lib/config/backgrounds';
import { themes } from '@/lib/config/themes';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

// Define the form schema using Zod
const figureFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  tagline: z.string().min(1, "Tagline is required").max(100),
  style: z.string().optional(),
  background: z.string().optional(),
  theme: z.string().optional(),
  accessories: z.string().optional(), // Store as comma-separated string for input
  boxColor: z.string().optional(),
  specialFeatures: z.string().max(200).optional(),
  imageUrl: z.string().url("A valid image URL is required"),
  size: z.string().default('1024x1024'), // Add size to schema, default to 1:1
});

// Define aspect ratio options - These values MUST match OpenAI supported sizes
const aspectRatioOptions = [
  { label: 'Square (1:1)', value: '1024x1024' },
  { label: 'Portrait (2:3)', value: '1024x1536' },
  { label: 'Landscape (3:2)', value: '1536x1024' },
];

// TypeScript type for form values inferred from schema
type FigureFormValues = z.infer<typeof figureFormSchema>;

interface EnqueueRequestBody {
  name: string;
  tagline: string;
  imageUrl: string;
  style?: string;
  background?: string;
  theme?: string;
  accessories: string[];
  boxColor?: string;
  specialFeatures?: string;
  size?: string; // Add size here
  access_token?: string; // Optional token for authentication
}

export default function GeneratePage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState<FigureFormValues>({
    name: '',
    tagline: '',
    style: styles[0]?.id || '',
    background: backgrounds[0]?.id || '',
    theme: themes[0]?.id || '',
    accessories: '',
    boxColor: 'blue',
    specialFeatures: '',
    imageUrl: '',
    size: aspectRatioOptions[0].value, // Initialize size to default 1:1
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Track upload status from FileUploader if needed
  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [errors, setErrors] = useState<z.ZodIssue[]>([]);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // Authentication check and credit loading
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoadingCredits(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Please sign in to generate figures.');
          router.push('/auth/sign-in?redirectUrl=/dashboard/generate');
          return;
        }
        // Fetch credits using client-side helper
        const { data: creditsData } = await supabase
          .from('credits')
          .select('balance')
          .eq('user_id', session.user.id)
          .single();
          
        setCurrentCredits(creditsData?.balance ?? 0);
      } catch (error) {
        console.error('Error checking auth or fetching credits:', error);
        toast.error('Could not fetch your credit balance.');
      } finally {
        setIsLoadingCredits(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleFileUpload = async (file: File, uploadedUrl?: string) => {
    if (uploadedUrl) {
      setFormValues(prev => ({ ...prev, imageUrl: uploadedUrl }));
      setUploadedFile(file);
      setErrors(prev => prev.filter(err => err.path[0] !== 'imageUrl')); // Clear image URL error
      console.log('Image uploaded:', uploadedUrl);
    } else {
      toast.error('Image upload failed, cannot proceed.');
    }
  };

  const handleChange = (field: keyof FigureFormValues, value: string | string[]) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user types
    if (errors.some(err => err.path[0] === field)) {
      setErrors(prev => prev.filter(err => err.path[0] !== field));
    }
  };
  
  // Handler for selecting aspect ratio
  const handleSizeChange = (newSize: string) => {
    setFormValues(prev => ({ ...prev, size: newSize }));
    // Clear validation error if any
    if (errors.some(err => err.path[0] === 'size')) {
      setErrors(prev => prev.filter(err => err.path[0] !== 'size'));
    }
  };

  const handleSubmit = async () => {
    setIsEnqueuing(true);
    setErrors([]); // Clear previous errors

    // Validate form using Zod
    const validationResult = figureFormSchema.safeParse(formValues);

    if (!validationResult.success) {
      setErrors(validationResult.error.issues);
      toast.error('Please fix the errors in the form.');
      setIsEnqueuing(false);
      return;
    }

    // Check credits again before submitting
    if (isLoadingCredits) {
      toast.error('Still loading credits, please wait.');
      setIsEnqueuing(false);
      return;
    }
    if (currentCredits === null || currentCredits < 1) {
      toast.error('Insufficient credits. Please buy more.');
      setIsEnqueuing(false);
      router.push('/dashboard/buy');
      return;
    }

    // Prepare data for enqueue endpoint
    const { accessories, size, ...restOfValues } = validationResult.data;
    const accessoriesArray = accessories ? accessories.split(',').map(item => item.trim()).filter(Boolean) : [];
    
    const enqueuePayload: EnqueueRequestBody = {
      ...restOfValues,
      accessories: accessoriesArray,
      size: size, // Include the selected size
    };

    try {
      // Get session token for fallback authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        enqueuePayload.access_token = session.access_token;
      }

      const response = await fetch('/api/figures/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header for robust auth
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(enqueuePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to enqueue job');
      }

      // Use toast.promise for better loading/success/error feedback
      toast.success('Figure generation started! Redirecting to dashboard...', { id: 'enqueue-toast' });
      
      // Dispatch custom event to trigger credit refresh in layout
      window.dispatchEvent(new CustomEvent('refreshCredits'));
      setTimeout(() => router.push('/dashboard'), 1500);

    } catch (error: any) {
      console.error('Enqueue Error:', error);
      toast.error(`Error: ${error.message}`, { id: 'enqueue-toast' });
      // Optionally, set a general error state for the form
      setErrors([{ path: ['form'], message: error.message, code: 'custom' }]);
    } finally {
      setIsEnqueuing(false);
    }
  };

  const getErrorForField = (fieldName: keyof FigureFormValues): string | undefined => {
    return errors.find(err => err.path[0] === fieldName)?.message;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Generate New Action Figure</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Upload a face photo and customize your figure details. Requires 1 credit per generation.
      </p>
      
      <div className="mb-4 p-3 rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm">
        Current Credits: {isLoadingCredits ? 'Loading...' : currentCredits ?? 'N/A'}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1. Upload Face Photo</CardTitle>
          <CardDescription>Upload a clear photo of the face you want to use. Max 8MB (JPEG/PNG).</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader
            onFileSelected={handleFileUpload}
            uploadToStorage={true} // Enable direct upload to Supabase via API
          />
          {getErrorForField('imageUrl') && <p className="text-red-600 text-sm mt-2">{getErrorForField('imageUrl')}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Customize Your Figure</CardTitle>
          <CardDescription>Define the name, tagline, style, and other details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <Input
              id="name"
              value={formValues.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Captain Code"
              maxLength={50}
              className={getErrorForField('name') ? 'border-red-500' : ''}
            />
            {getErrorForField('name') && <p className="text-red-600 text-sm mt-1">{getErrorForField('name')}</p>}
          </div>
          {/* Tagline Input */}
          <div>
            <label htmlFor="tagline" className="block text-sm font-medium mb-1">Tagline</label>
            <Input
              id="tagline"
              value={formValues.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              placeholder="e.g., Defender of the Digital Realm"
              maxLength={100}
              className={getErrorForField('tagline') ? 'border-red-500' : ''}
            />
            {getErrorForField('tagline') && <p className="text-red-600 text-sm mt-1">{getErrorForField('tagline')}</p>}
          </div>
          
          {/* Aspect Ratio Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
            <div className="flex flex-col sm:flex-row gap-2">
              {aspectRatioOptions.map(option => (
                <Button
                  key={option.value}
                  variant={formValues.size === option.value ? 'default' : 'outline'}
                  onClick={() => handleSizeChange(option.value)}
                  className="flex-1"
                >
                  {option.label} 
                  <span className="text-xs ml-1 text-neutral-500 dark:text-neutral-400">({option.value})</span>
                </Button>
              ))}
            </div>
            {getErrorForField('size') && <p className="text-red-600 text-sm mt-1">{getErrorForField('size')}</p>}
          </div>
          
          {/* Style & Background Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="style" className="block text-sm font-medium mb-1">Style</label>
              <Select value={formValues.style} onValueChange={(value) => handleChange('style', value)}>
                <SelectTrigger id="style" className={getErrorForField('style') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select style..." />
                </SelectTrigger>
                <SelectContent>
                  {styles.map(style => (
                    <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getErrorForField('style') && <p className="text-red-600 text-sm mt-1">{getErrorForField('style')}</p>}
            </div>
            <div>
              <label htmlFor="background" className="block text-sm font-medium mb-1">Background</label>
              <Select value={formValues.background} onValueChange={(value) => handleChange('background', value)}>
                <SelectTrigger id="background" className={getErrorForField('background') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select background..." />
                </SelectTrigger>
                <SelectContent>
                  {backgrounds.map(bg => (
                    <SelectItem key={bg.id} value={bg.id}>{bg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getErrorForField('background') && <p className="text-red-600 text-sm mt-1">{getErrorForField('background')}</p>}
            </div>
          </div>
          
          {/* Theme & Box Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">Theme</label>
              <Select value={formValues.theme} onValueChange={(value) => handleChange('theme', value)}>
                <SelectTrigger id="theme" className={getErrorForField('theme') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select theme..." />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getErrorForField('theme') && <p className="text-red-600 text-sm mt-1">{getErrorForField('theme')}</p>}
            </div>
            <div>
              <label htmlFor="boxColor" className="block text-sm font-medium mb-1">Box Color</label>
              <Input
                id="boxColor"
                value={formValues.boxColor}
                onChange={(e) => handleChange('boxColor', e.target.value)}
                placeholder="e.g., blue, #FF0000"
                className={getErrorForField('boxColor') ? 'border-red-500' : ''}
              />
              {getErrorForField('boxColor') && <p className="text-red-600 text-sm mt-1">{getErrorForField('boxColor')}</p>}
            </div>
          </div>

          {/* Accessories Input */}
          <div>
            <label htmlFor="accessories" className="block text-sm font-medium mb-1">Accessories (comma-separated)</label>
            <Input
              id="accessories"
              value={formValues.accessories}
              onChange={(e) => handleChange('accessories', e.target.value)}
              placeholder="e.g., sword, shield, helmet"
              className={getErrorForField('accessories') ? 'border-red-500' : ''}
            />
            {getErrorForField('accessories') && <p className="text-red-600 text-sm mt-1">{getErrorForField('accessories')}</p>}
          </div>
          {/* Special Features Textarea */}
          <div>
            <label htmlFor="specialFeatures" className="block text-sm font-medium mb-1">Special Features (Optional)</label>
            <Textarea
              id="specialFeatures"
              value={formValues.specialFeatures}
              onChange={(e) => handleChange('specialFeatures', e.target.value)}
              placeholder="Describe any unique details, e.g., glowing eyes, battle scars"
              maxLength={200}
              rows={2}
              className={getErrorForField('specialFeatures') ? 'border-red-500' : ''}
            />
             {getErrorForField('specialFeatures') && <p className="text-red-600 text-sm mt-1">{getErrorForField('specialFeatures')}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Form-level error display */}
      {errors.find(err => err.path[0] === 'form') && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          {errors.find(err => err.path[0] === 'form')?.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isEnqueuing || isUploading || isLoadingCredits || currentCredits === null || currentCredits < 1}
          className="gap-2"
        >
          {isEnqueuing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Starting Generation...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" /> Generate Figure (1 Credit)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}