import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pacotes @central/* direto do código-fonte, sem build prévio.
  resolve: { conditions: ['@central/source', ...defaultClientConditions] },
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3200' },
  },
});
