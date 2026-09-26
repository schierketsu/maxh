import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
