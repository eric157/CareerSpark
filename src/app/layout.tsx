import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'; // Removed
import { Toaster } from '@/components/ui/toaster';
// import AppSidebar from '@/components/layout/AppSidebar'; // Removed

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Career Spark',
  description: 'AI-Powered Job Search & Resume Analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen flex-col bg-background">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
