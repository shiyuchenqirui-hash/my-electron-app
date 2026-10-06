import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./ui', import.meta.url)) } },
  build: {
    outDir: 'dist/renderer',
    sourcemap: true,
    // Keep learning breakpoints readable in DevTools as well as via source maps.
    minify: false,
    rollupOptions: {
      input: ['index.html', 'settings.html', 'navigation-target.html', 'session-lab.html']
    }
  }
})
