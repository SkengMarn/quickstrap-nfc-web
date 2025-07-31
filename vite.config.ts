import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Set the public directory
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
    cors: true,
    // Enable SPA fallback
    fs: {
      strict: false
    },
    // Handle 404s by serving index.html for all routes
    // This is handled by the Vite SPA plugin
    // No need for proxy in this case
  },
  // Configure the root directory for the dev server
  root: './',
  // Resolve path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Specify the root HTML file
    rollupOptions: {
      input: path.resolve(__dirname, 'public/index.html'),
    },
  },
  define: {
    'process.env': {}
  },
  base: '/'
})
