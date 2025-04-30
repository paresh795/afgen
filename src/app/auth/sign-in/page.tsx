import SignInFormWrapper from '@/components/SignInFormWrapper';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - ActionFig',
  description: 'Sign in to your ActionFig account',
};

export default function SignInPageWrapper() {
  return <SignInFormWrapper />;
} 