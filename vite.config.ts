/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const mocksOn = loadEnv(mode, process.cwd(), 'VITE_').VITE_USE_MOCKS === 'true'
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // The MSW service worker must never reach a real deployment.
        name: 'strip-mock-worker',
        apply: 'build' as const,
        closeBundle() {
          if (!mocksOn) fs.rmSync(path.resolve('dist/mockServiceWorker.js'), { force: true })
        },
      },
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
    build: { sourcemap: 'hidden' as const, target: ['es2022', 'safari16', 'chrome111', 'firefox128'] },
    server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } } },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
