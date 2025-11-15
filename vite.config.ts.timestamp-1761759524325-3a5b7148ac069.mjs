// vite.config.ts
import react from "file:///Users/jew/Desktop/quickstrap_nfc_web/node_modules/@vitejs/plugin-react/dist/index.js";
import * as path from "path";
import { defineConfig } from "file:///Users/jew/Desktop/quickstrap_nfc_web/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "/Users/jew/Desktop/quickstrap_nfc_web";
var vite_config_default = defineConfig({
  plugins: [react()],
  publicDir: "public",
  optimizeDeps: {
    force: false,
    exclude: ["leaflet", "d3-geo", "react-simple-maps"],
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".ts": "tsx"
      }
    }
  },
  server: {
    port: 3e3,
    host: "localhost",
    open: false,
    cors: true,
    strictPort: false,
    fs: {
      strict: true,
      allow: [".."]
      // Only allow parent directory access
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src")
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"]
  },
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
    // Only enable sourcemaps in development
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__vite_injected_original_dirname, "index.html"),
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  },
  define: {
    "process.env": {}
  },
  base: "/",
  preview: {
    port: 3e3,
    strictPort: true
  },
  envPrefix: "VITE_"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvamV3L0Rlc2t0b3AvcXVpY2tzdHJhcF9uZmNfd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamV3L0Rlc2t0b3AvcXVpY2tzdHJhcF9uZmNfd2ViL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qZXcvRGVza3RvcC9xdWlja3N0cmFwX25mY193ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsXG4gIG9wdGltaXplRGVwczoge1xuICAgIGZvcmNlOiBmYWxzZSxcbiAgICBleGNsdWRlOiBbJ2xlYWZsZXQnLCAnZDMtZ2VvJywgJ3JlYWN0LXNpbXBsZS1tYXBzJ10sXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgIGxvYWRlcjoge1xuICAgICAgICAnLmpzJzogJ2pzeCcsXG4gICAgICAgICcudHMnOiAndHN4JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICBvcGVuOiBmYWxzZSxcbiAgICBjb3JzOiB0cnVlLFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgIGZzOiB7XG4gICAgICBzdHJpY3Q6IHRydWUsXG4gICAgICBhbGxvdzogWycuLiddIC8vIE9ubHkgYWxsb3cgcGFyZW50IGRpcmVjdG9yeSBhY2Nlc3NcbiAgICB9XG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjJylcbiAgICB9LFxuICAgIGV4dGVuc2lvbnM6IFsnLm1qcycsICcuanMnLCAnLm10cycsICcudHMnLCAnLmpzeCcsICcudHN4JywgJy5qc29uJ11cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnLCAvLyBPbmx5IGVuYWJsZSBzb3VyY2VtYXBzIGluIGRldmVsb3BtZW50XG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYnOiB7fVxuICB9LFxuICBiYXNlOiAnLycsXG4gIHByZXZpZXc6IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gIH0sXG4gIGVudlByZWZpeDogJ1ZJVEVfJyxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpUyxPQUFPLFdBQVc7QUFDblQsWUFBWSxVQUFVO0FBQ3RCLFNBQVMsb0JBQW9CO0FBRjdCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixXQUFXO0FBQUEsRUFDWCxjQUFjO0FBQUEsSUFDWixPQUFPO0FBQUEsSUFDUCxTQUFTLENBQUMsV0FBVyxVQUFVLG1CQUFtQjtBQUFBLElBQ2xELGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ04sT0FBTztBQUFBLFFBQ1AsT0FBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osSUFBSTtBQUFBLE1BQ0YsUUFBUTtBQUFBLE1BQ1IsT0FBTyxDQUFDLElBQUk7QUFBQTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFVLGFBQVEsa0NBQVcsS0FBSztBQUFBLElBQ3BDO0FBQUEsSUFDQSxZQUFZLENBQUMsUUFBUSxPQUFPLFFBQVEsT0FBTyxRQUFRLFFBQVEsT0FBTztBQUFBLEVBQ3BFO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXLFFBQVEsSUFBSSxhQUFhO0FBQUE7QUFBQSxJQUNwQyxhQUFhO0FBQUEsSUFDYixlQUFlO0FBQUEsTUFDYixPQUFZLGFBQVEsa0NBQVcsWUFBWTtBQUFBLE1BQzNDLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLFFBQVEsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsUUFDbkQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGVBQWUsQ0FBQztBQUFBLEVBQ2xCO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsV0FBVztBQUNiLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
