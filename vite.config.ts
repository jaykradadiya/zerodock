import { defineConfig, type Plugin, type ViteDevServer, type Connect } from 'vite'
import type { ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Local dev server mock plugin for /api/feedback
function feedbackDevPlugin(): Plugin {
  return {
    name: 'feedback-dev-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (req.url === '/api/feedback' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer | string) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              console.log('\n📨 [ZeroDock Dev Server] Feedback received:');
              console.log(JSON.stringify(parsed, null, 2));
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: 'Feedback received successfully in local dev mode!',
                })
              );
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    feedbackDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'ZeroDock',
        short_name: 'ZeroDock',
        description: 'Privacy-First Web Utility & Developer Toolbox',
        theme_color: '#000000',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
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
          if (id.includes('node_modules/@monaco-editor/react/') || id.includes('node_modules/monaco-editor/')) {
            return 'monaco-vendor';
          }
        }
      }
    }
  }
})
