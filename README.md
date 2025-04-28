# ActionFig Generator (afgen)

This project is a web application built with Next.js, TypeScript, Supabase, Stripe, QStash, and the OpenAI API. It allows users to upload a face photo and generate a customized, high-resolution image of a boxed action figure based on that photo.

## Features

*   User authentication (Supabase Auth)
*   Face photo upload (Supabase Storage)
*   Customizable figure details (Name, Tagline, Style, Accessories, etc.)
*   Image generation via OpenAI Edits API
*   Background job processing using Upstash QStash
*   Credit system integrated with Stripe payments
*   User dashboard to view generated figures and billing history

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   pnpm (or npm/yarn)
*   Supabase account
*   Stripe account
*   OpenAI API key
*   Upstash account (for QStash)
*   ngrok (for local webhook testing)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd afgen
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up Supabase:**
    *   Create a new Supabase project.
    *   In the SQL Editor, run the contents of `src/db/schema.sql` to set up tables, storage, and RLS policies.
    *   Get your Project URL and Anon Key from Project Settings -> API.
    *   Get your Service Role Key from Project Settings -> API (keep this secret!).

4.  **Set up Stripe:**
    *   Create two Products in your Stripe Dashboard (e.g., "Single Credit", "Group Credits").
    *   Create corresponding Prices for each Product (e.g., $1.99 CAD, $6.99 CAD). Note the Price IDs.
    *   Get your Publishable Key and Secret Key from Developers -> API Keys.
    *   Set up a webhook endpoint pointing to `/api/stripe/webhook` (use ngrok for local testing). Get the Webhook Signing Secret.

5.  **Set up OpenAI:**
    *   Get your API key from your OpenAI account settings.

6.  **Set up Upstash QStash:**
    *   Create a QStash topic or use the direct URL method.
    *   Get your QStash URL, Token, Current Signing Key, and Next Signing Key from the Upstash console.

7.  **Configure Environment Variables:**
    *   Copy `.env.example` to `.env.local`.
    *   Fill in all the required values obtained from the steps above.
    *   For local development, set `NEXT_PUBLIC_SITE_URL` initially to `http://localhost:3000`.

### Running Locally

1.  **Start the development server:**
    ```bash
    pnpm run dev
    ```
    The app should be running at `http://localhost:3000`.

2.  **(Optional) Set up ngrok for Webhooks:**
    *   If testing Stripe webhooks or QStash callbacks locally, start ngrok:
      ```bash
      ngrok http 3000
      ```
    *   Copy the HTTPS forwarding URL provided by ngrok.
    *   Update `NEXT_PUBLIC_SITE_URL` in your `.env.local` file with the ngrok HTTPS URL.
    *   Update your Stripe webhook endpoint URL to use the ngrok URL + `/api/stripe/webhook`.
    *   **Restart the Next.js dev server** (`pnpm run dev`) after changing the `.env.local` file.

## Deployment

This application is configured for easy deployment on Vercel. Ensure all environment variables are set correctly in your Vercel project settings.

## Contributing

(Add contribution guidelines if applicable)

## License

(Specify license, e.g., MIT)
