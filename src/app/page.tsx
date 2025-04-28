import Link from "next/link";
import { ArrowRight, Gift, Image as ImageIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
        <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
              Turn your face into a{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                boxed action figure
              </span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-300 max-w-xl">
              Create a high-resolution action figure mock-up from your selfie in seconds. Ready for social media, mugs, t-shirts, and more.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard/generate">
                  Try it now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/sign-in">
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 bg-white dark:bg-neutral-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-xl font-medium mb-2">1. Upload your photo</h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Just upload a clear face photo and customize your figure details.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-medium mb-2">2. Our AI works magic</h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Our advanced AI transforms your photo into a professional action figure.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-xl font-medium mb-2">3. Get your figure</h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Download your high-resolution action figure image for any use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Simple Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-bold mb-2">Single</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">Perfect for a quick gift or social media post</p>
              <p className="text-4xl font-bold mb-6">$1.99</p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-600 dark:text-green-300">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>1 action figure generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-600 dark:text-green-300">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>High-resolution PNG file</span>
          </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/dashboard/generate">Buy Single</Link>
              </Button>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 border-2 border-blue-500 dark:border-blue-400 rounded-xl p-8 shadow-md relative">
              <div className="absolute -top-3 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">Popular</div>
              <h3 className="text-xl font-bold mb-2">Group</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">Perfect for family or multiple tries</p>
              <p className="text-4xl font-bold mb-6">$6.99</p>
              <ul className="space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-600 dark:text-green-300">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>4 action figure generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-600 dark:text-green-300">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>High-resolution PNG files</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-600 dark:text-green-300">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Bulk discount (42% off)</span>
                </li>
              </ul>
              <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
                <Link href="/dashboard/generate">Buy Group</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 text-center text-neutral-600 dark:text-neutral-400">
          <p>© {new Date().getFullYear()} ActionFig. All rights reserved.</p>
          <p className="mt-2 text-sm">Powered by Next.js, Supabase, and Pi API.</p>
        </div>
      </footer>
    </div>
  );
}
