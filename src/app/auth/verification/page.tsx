"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href="/" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </Button>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-300" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          We&apos;ve sent you a verification link to complete your registration.
        </p>
        
        <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p>
            Can&apos;t find the email? Check your spam folder or{" "}
            <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-500">
              try again with a different email
            </Link>
            .
          </p>
        </div>

        <div className="mt-8">
          <Button asChild className="w-full">
            <Link href="/auth/sign-in">
              Back to Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 