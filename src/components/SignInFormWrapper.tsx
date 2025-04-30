'use client';

import { Suspense } from 'react';
import SignInForm from '@/app/auth/sign-in/SignInForm';

// Renamed from SignInPageClient to avoid confusion
function SignInClientComponent() {
  return <SignInForm />;
}

// The wrapper component that uses Suspense
export default function SignInFormWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}> {/* Basic fallback UI */}
      <SignInClientComponent />
    </Suspense>
  );
} 