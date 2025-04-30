import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from 'next/font/google';
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['600', '700']
});

export const metadata: Metadata = {
  title: "ActionFig - Turn your face into an action figure",
  description: "Generate a high-resolution boxed action figure mock-up from your face photo.",
  keywords: ["action figure", "photo to action figure", "personalized figure", "custom toy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased h-full`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
