import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  define: {
    global: 'globalThis',
  },
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api-gateway-606057767170.asia-southeast1.run.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },

      '/ws': {
        target: 'wss://api-gateway-606057767170.asia-southeast1.run.app',
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: (path) => path,
      }
    }
  }
})
