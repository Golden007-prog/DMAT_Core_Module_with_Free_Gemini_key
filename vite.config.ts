/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from /<repo-name>/ — the deploy workflow sets this.
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CoreForge — dMAT Practice',
        short_name: 'CoreForge',
        description:
          'Free practice platform for the complete dMAT: Core Module (Figure Sequences, Mathematical Equations, Latin Squares) and General Academic Module. Unofficial.',
        theme_color: '#A3195B',
        background_color: '#F6F6F8',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // media/*.webp is deliberately NOT precached — marketing images load
        // runtime-cached so the install size stays lean
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['media/**'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: /\/media\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // stable vendor chunks: app-code releases don't re-download React
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
  },
});
