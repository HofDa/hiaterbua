import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> "./src/*" path mapping so tests can import
      // app modules (including repositories) the same way the app does.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
