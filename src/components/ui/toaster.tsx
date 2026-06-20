'use client'

import { Toaster as HotToaster } from 'react-hot-toast'

export function Toaster() {
  return (
    <HotToaster
      position="bottom-center"
      containerStyle={{
        bottom: 'calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)',
      }}
      toastOptions={{ duration: 3000 }}
    />
  )
}
