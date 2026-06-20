import { cn } from '@/lib/utils/cn'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PageContainer } from '@/components/layout/page-container'
import { StatusStrip } from '@/components/layout/status-strip'
import { TopBar } from '@/components/layout/top-bar'
import { AppRoutePrefetch } from '@/components/pwa/app-route-prefetch'
import { ServiceWorkerSync } from '@/components/pwa/service-worker-sync'
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog'
import { ConnectivityBanner } from '@/components/ui/connectivity-banner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pastore 1.0',
  description: 'Offlinefähige Feld- und Alm-Dokumentation für Herden, Pferche und Weidegänge',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pastore 1.0',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#123a2d',
  // Extend under the device safe areas (notch / home indicator) so the chrome
  // can fill them — required for env(safe-area-inset-*) to be non-zero.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', GeistSans.variable)}>
        <div className="min-h-screen text-ink-strong">
          <ServiceWorkerSync />
          <AppRoutePrefetch />
          <ConfirmDialogProvider>
            <TopBar />
            <StatusStrip />
            <ErrorBoundary>
              <PageContainer>{children}</PageContainer>
            </ErrorBoundary>
            <BottomNav />
            <ConnectivityBanner />
            <Toaster />
          </ConfirmDialogProvider>
        </div>
      </body>
    </html>
  )
}
