"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatPrice } from '@/lib/utils';
import { supabase, getUserPayments } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

// Define the type for our payment data based on the schema
interface Payment {
  id: string;
  user_id: string;
  stripe_session: string | null;
  amount_cents: number;
  credits_added: number;
  status: string;
  created_at: string; // ISO string from DB
}

export default function BillingHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaymentHistory() {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Fetch payments using the new helper
        const { payments: fetchedPayments, count } = await getUserPayments(user.id);

        // Instead of checking fetchError, check if the result is valid
        // Note: getUserPayments currently returns [] on error, so this check might primarily catch cases where the helper itself failed unexpectedly, though we have a try/catch.
        // A more robust check might involve seeing if count is null if an error truly occurred in the query itself.
        if (!Array.isArray(fetchedPayments)) { 
          throw new Error('Failed to fetch payment history - invalid data received');
        }
        
        console.log(`[BillingHistoryPage] Fetched ${fetchedPayments.length} payments (total count: ${count})`);
        setPayments(fetchedPayments);

      } catch (err: any) {
        console.error('[BillingHistoryPage] Error loading payment history:', err);
        setError(err.message || 'Could not load billing history.');
        toast.error(err.message || 'Could not load billing history.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPaymentHistory();
  }, []); // Run once on mount

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing History</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            View your payment history and credit purchases
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/buy">Buy Credits</Link>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin mx-auto" />
            <p>Loading billing history...</p>
          </div>
        </div>
      ) : error ? ( /* Error State */
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-12 text-center dark:border-red-700 dark:bg-red-900/30">
          <h3 className="mb-2 text-lg font-medium text-red-800 dark:text-red-200">Error Loading History</h3>
          <p className="mb-6 text-red-600 dark:text-red-400">
            {error}
          </p>
          {/* Optional: Add a retry button here */}
        </div>
      ) : payments.length === 0 ? ( /* Empty State */
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mb-2 text-lg font-medium">No billing history</h3>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">
            You haven&apos;t made any purchases yet.
          </p>
          <Button asChild>
            <Link href="/dashboard/buy">Buy Your First Credits</Link>
          </Button>
        </div>
      ) : ( /* Data Loaded State */
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                >
                  Transaction
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                >
                  Credits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium">{payment.credits_added === 1 ? 'Single Plan' : 'Group Plan'} ({payment.credits_added} credit{payment.credits_added !== 1 ? 's' : ''})</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {payment.stripe_session || payment.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {formatDate(new Date(payment.created_at))}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    {formatPrice(payment.amount_cents)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold uppercase leading-5 ${payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <span className="mr-2 font-bold">+{payment.credits_added}</span>
                    {payment.stripe_session && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        asChild
                      >
                        <a
                          href={`https://dashboard.stripe.com/test/checkout/sessions/${payment.stripe_session}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          <span className="sr-only">View details</span>
                        </a>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 