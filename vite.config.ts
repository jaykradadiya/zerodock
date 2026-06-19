import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@tanstack/react-router/')) {
            return 'router-vendor';
          }
          if (id.includes('node_modules/@monaco-editor/react/')) {
            return 'monaco-vendor';
          }
        }
      }
    }
  }
})
