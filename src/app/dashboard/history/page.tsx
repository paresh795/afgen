"use client";

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

// Mock data for billing history - in real app, this would come from Stripe
const mockPayments = [
  {
    id: 'cs_123456789',
    description: 'Single Plan (1 credit)',
    amount: '$1.99',
    date: new Date(2023, 4, 10),
    status: 'completed',
    credits: 1,
  },
  {
    id: 'cs_987654321',
    description: 'Group Plan (4 credits)',
    amount: '$6.99',
    date: new Date(2023, 5, 15),
    status: 'completed',
    credits: 4,
  },
];

export default function BillingHistoryPage() {
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

      {mockPayments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h3 className="mb-2 text-lg font-medium">No billing history</h3>
          <p className="mb-6 text-neutral-600 dark:text-neutral-400">
            You haven't made any purchases yet.
          </p>
          <Button asChild>
            <Link href="/dashboard/buy">Buy Your First Credits</Link>
          </Button>
        </div>
      ) : (
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
              {mockPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium">{payment.description}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {payment.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {formatDate(payment.date)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    {payment.amount}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold uppercase leading-5 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {payment.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <span className="mr-2 font-bold">+{payment.credits}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      asChild
                    >
                      <a
                        href={`https://dashboard.stripe.com/test/payments/${payment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        <span className="sr-only">View receipt</span>
                      </a>
                    </Button>
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