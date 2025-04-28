"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewFigurePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new generate page
    router.replace('/dashboard/generate');
  }, [router]);
  
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary mx-auto"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  );
} 