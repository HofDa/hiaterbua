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
  test: {
    // The Dexie repositories run against an in-memory IndexedDB (fake-indexeddb)
    // installed by the setup file. Pure-logic tests ignore it harmlessly.
    setupFiles: ['./vitest.setup.ts'],
  },
})
