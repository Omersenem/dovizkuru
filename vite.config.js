import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/dovizkuru/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api/tcmb': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
