import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  // Переменные VITE_* берём из общего .env в корне репозитория: у решения
  // один файл с ключами на бота и мини-апп, а не отдельный на каждый пакет.
  envDir: resolve(here, '..'),
  build: {
    // Не удаляем бандлы прошлых сборок: index.html кэшируется в WebView
    // мессенджера, и устаревшая копия иначе просит уже удалённый файл —
    // мини-апп зависал на белом экране с бесконечным лоадером.
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
