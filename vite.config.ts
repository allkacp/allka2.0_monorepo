import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), componentTagger()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 8080,
    open: true,
  },
})
