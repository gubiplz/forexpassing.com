import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Forex Passing Ebook — landing page (mockup).
// Port dev: 3005 (3003 = charts vite, 3004 = charts server).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    host: true,
    proxy: {
      // ⚠ CASE STUDY — w dev mode forwarduj /api/cloak/* do wrangler dev (:8787).
      // Bez tego SPA na :3005 nie dosięgnie Workera. Wrangler odpalany osobno:
      // `npm run dev:worker` (po wcześniejszym `npm run build`).
      '/api/cloak': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/admin-bot-trap': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3005,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Opaque chunk names — no MoneyPage/SafePage giveaway in DevTools Network.
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'v'
          }
        },
      },
    },
  },
})
