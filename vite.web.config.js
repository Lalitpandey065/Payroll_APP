import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  plugins: [
    react(),
    {
      name: 'inject-mock-api',
      transformIndexHtml(html) {
        return html.replace(
          '<script type="module" src="/main.jsx">',
          '<script type="module" src="/mock-api.js"></script>\n    <script type="module" src="/main.jsx">'
        );
      }
    }
  ],
  server: {
    port: 3100,
    host: '0.0.0.0',
    strictPort: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
