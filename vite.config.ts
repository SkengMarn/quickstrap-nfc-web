import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  cacheDir: 'node_modules/.vite',
  optimizeDeps: {
    force: false,
    exclude: ['leaflet', 'd3-geo', 'react-simple-maps'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'react-toastify',
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx',
      },
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
    open: false,
    cors: true,
    strictPort: false,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/*.sql',
        '**/*.md',
        '**/supabase/**',
        '**/database/**',
        '**/docs/**',
        '**/*.csv',
        '**/*.sh',
        '**/public/*.html',
        '!**/public/index.html'
      ],
      usePolling: false,
    },
    fs: {
      strict: true,
      allow: ['.']
    },
    hmr: {
      overlay: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
          'vendor-ui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          'vendor-maps': ['leaflet', 'react-leaflet', 'react-simple-maps'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'entries/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'process.env': {}
  },
  base: '/',
  preview: {
    port: 3000,
    strictPort: true,
  },
  envPrefix: 'VITE_',
});
