import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: __dirname,
  plugins: [react(), tailwindcss(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
  server: {
    port: 8080,
    open: '/admin/dashboard',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/ARQUIVOS_NAO_USADOS_NO_MOMENTO/**', '**/node_modules/**', '**/.git/**'],
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'recharts',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'date-fns',
    ],
  },
}))
