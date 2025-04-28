import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface FileUploaderProps {
  onFileSelected: (file: File, uploadedUrl?: string) => void;
  maxSizeMB?: number;
  accept?: string;
  uploadToStorage?: boolean;
}

export function FileUploader({
  onFileSelected,
  maxSizeMB = 8,
  accept = 'image/jpeg, image/png',
  uploadToStorage = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return false;
    }

    // Check file type
    const fileType = file.type;
    const acceptedTypes = accept.split(',').map(type => type.trim());
    if (!acceptedTypes.includes(fileType)) {
      setError(`File type not supported. Please upload ${accept}.`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      if (validateFile(file)) {
        processFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        processFile(file);
      }
    }
  };

  const uploadToServer = async (file: File): Promise<string | undefined> => {
    try {
      setIsUploading(true);
      
      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check in FileUploader:', session ? 'Session found' : 'No session');
      
      if (!session) {
        setError('You need to be logged in to upload files');
        toast.error('Authentication required', { id: 'auth-error' });
        
        setTimeout(() => {
          window.location.href = `/auth/sign-in?redirectUrl=${window.location.pathname}`;
        }, 1500);
        return undefined;
      }
      
      console.log('File details:', {
        name: file.name, 
        type: file.type, 
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add session token as fallback authentication method
      // in case cookies don't work
      if (session.access_token) {
        console.log('Adding access_token to form data as fallback auth');
        formData.append('access_token', session.access_token);
      }
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log('Starting upload with user:', session.user.email);
      
      // Use XMLHttpRequest instead of fetch to ensure cookies are sent properly
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', '/api/upload', true);
        xhr.timeout = 30000; // 30 second timeout
        
        // Set up event handlers
        xhr.onload = function() {
          clearTimeout(timeoutId);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Upload response:', response);
              
              if (response.success && response.url) {
                console.log('Upload successful, auth method:', response.authMethod || 'unknown');
                toast.success('File uploaded successfully');
                resolve(response.url);
              } else {
                const errorMsg = response.error || 'Upload failed with unknown error';
                console.error('Upload failed:', errorMsg);
                reject(new Error(errorMsg));
              }
            } catch (e) {
              console.error('Failed to parse server response:', e);
              reject(new Error('Invalid response from server'));
            }
          } else if (xhr.status === 401) {
            console.error('Authentication failed during upload (401)');
            setError('Please sign in to upload files');
            toast.error('Authentication required', { id: 'auth-error' });
            
            // Wait a moment before redirect
            setTimeout(() => {
              window.location.href = `/auth/sign-in?redirectUrl=${window.location.pathname}`;
            }, 1500);
            
            reject(new Error('Authentication required'));
          } else {
            try {
              // Try to parse error response
              const errorData = JSON.parse(xhr.responseText);
              const errorMessage = errorData.error || `Server error (${xhr.status})`;
              console.error('Server error response:', errorData);
              setError(errorMessage);
              if (errorData.details) {
                console.error('Error details:', errorData.details);
              }
              reject(new Error(errorMessage));
            } catch (e) {
              // Fall back to generic error if parsing fails
              console.error(`Server error (${xhr.status})`, xhr.responseText);
              setError(`Server error (${xhr.status})`);
              reject(new Error(`Server responded with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function() {
          clearTimeout(timeoutId);
          console.error('Network error during upload');
          setError('Network error. Please check your connection and try again.');
          reject(new Error('Network error during upload'));
        };
        
        xhr.ontimeout = function() {
          console.error('Upload timed out after 30 seconds');
          setError('Upload timed out. Please try again.');
          reject(new Error('Upload timed out. Please try again.'));
        };
        
        // Log progress
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        };
        
        // This is key for sending cookies - withCredentials must be true
        xhr.withCredentials = true;
        
        // Send the form data
        console.log('Sending XHR request with credentials');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'File upload failed';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Upload timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setError(errorMessage);
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = async (file: File) => {
    // Store the selected file
    setSelectedFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload to storage if requested
    if (uploadToStorage) {
      const uploadedUrl = await uploadToServer(file);
      if (uploadedUrl) {
        // Call the callback only if upload was successful
        onFileSelected(file, uploadedUrl);
      }
    } else {
      // Call the callback immediately if no upload needed
      onFileSelected(file);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setPreview(null);
    setError(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    if (selectedFile && uploadToStorage) {
      setError(null);
      toast.loading('Retrying upload...', { id: 'retry-upload' });
      console.log('Retrying upload for file:', selectedFile.name);
      
      uploadToServer(selectedFile).then(uploadedUrl => {
        toast.dismiss('retry-upload');
        if (uploadedUrl) {
          toast.success('Upload successful on retry');
          onFileSelected(selectedFile, uploadedUrl);
        }
      }).catch(error => {
        toast.dismiss('retry-upload');
        toast.error(`Retry failed: ${error.message}`);
        console.error('Retry upload failed:', error);
      });
    } else {
      handleRemoveFile();
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={accept}
        className="hidden"
        disabled={isUploading}
      />

      {!preview ? (
        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : isUploading
              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
              : 'border-neutral-300 dark:border-neutral-700'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            {error ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : isUploading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"></div>
            ) : (
              <Upload className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
            )}
          </div>
          
          {error ? (
            <div className="mb-4 text-destructive">
              <p className="mb-2 font-medium">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRetry}
              >
                {selectedFile ? 'Retry Upload' : 'Try Again'}
              </Button>
            </div>
          ) : isUploading ? (
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Uploading file... Please wait
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm font-medium">
                Drag & drop a face photo here
              </p>
              <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                JPEG or PNG, max {maxSizeMB}MB. Best results with a clear face photo.
              </p>
              <Button size="sm" onClick={handleButtonClick}>
                Browse Files
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="absolute right-2 top-2 z-10">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleRemoveFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg">
            <img
              src={preview}
              alt="Preview"
              className="h-auto w-full object-cover"
            />
          </div>
          {error && (
            <div className="mt-2 rounded-md bg-destructive/10 p-3 text-destructive">
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRetry} 
                className="mt-2"
              >
                Retry Upload
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 