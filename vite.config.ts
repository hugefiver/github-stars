import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [],
      output: {
        format: 'es',
        manualChunks: {
          flexsearch: ['flexsearch'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['flexsearch'],
  },
  base: './',
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
