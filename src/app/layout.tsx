import type { Metadata, Viewport } from 'next'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PageContainer } from '@/components/layout/page-container'
import { StatusStrip } from '@/components/layout/status-strip'
import { TopBar } from '@/components/layout/top-bar'
import { ServiceWorkerSync } from '@/components/pwa/service-worker-sync'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hiaterbua 1.0',
  description: 'Offlinefähige Feld- und Alm-Dokumentation für Herden, Pferche und Weidegänge',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hiaterbua 1.0',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
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
          <TopBar />
          <StatusStrip />
          <PageContainer>{children}</PageContainer>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
