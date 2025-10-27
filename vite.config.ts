import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // 确保 Web Worker 被正确处理
      external: [],
      output: {
        format: 'es',
        manualChunks: {
          flexsearch: ['flexsearch'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['flexsearch']
  },
  base: './',
  worker: {
    format: 'es'
  }
})
