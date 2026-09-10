import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: env.VITE_SUPABASE_URL
        ? {
            '/api/supabase': {
              target: env.VITE_SUPABASE_URL,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
            },
          }
        : undefined,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  };
});