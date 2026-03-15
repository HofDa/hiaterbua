import type { Metadata, Viewport } from 'next'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PageContainer } from '@/components/layout/page-container'
import { StatusStrip } from '@/components/layout/status-strip'
import { TopBar } from '@/components/layout/top-bar'
import { AppRoutePrefetch } from '@/components/pwa/app-route-prefetch'
import { AppAccessGate } from '@/components/pwa/app-access-gate'
import { ServiceWorkerSync } from '@/components/pwa/service-worker-sync'
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <div className="min-h-screen text-neutral-950">
          <ServiceWorkerSync />
          <AppRoutePrefetch />
          <AppAccessGate />
          <TopBar />
          <StatusStrip />
          <PageContainer>{children}</PageContainer>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
