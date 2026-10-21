import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// SÓ NO COMPUTADOR LOCAL (modo dev; o build de produção NÃO muda): deixa a abertura das telas mais rápida.
//  • o CSS de fontes do Google deixa de BLOQUEAR a página (carrega em segundo plano; enquanto não chega, usa a fonte do sistema);
//  • o script do Google Maps só é pedido se a chave VITE_GOOGLE_MAPS_API_KEY existir (sem a chave ele só gerava um pedido inútil).
// Para voltar ao comportamento normal no dev, apague este plugin. Registrado em docs/RETOMAR-AQUI.md (seção "Velocidade local").
function localDevFastHtml(): import("vite").Plugin {
  return {
    name: "local-dev-fast-html",
    apply: "serve",
    transformIndexHtml(html) {
      let out = html.replace(
        /<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)" rel="stylesheet" \/>/,
        `<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel='stylesheet'" /><noscript><link rel="stylesheet" href="$1" /></noscript>`,
      );
      if (!process.env.VITE_GOOGLE_MAPS_API_KEY) {
        out = out.replace(/<script\s+src="https:\/\/maps\.googleapis\.com[^>]*>\s*<\/script>/, "");
      }
      return out;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: __dirname,
  plugins: [
    react(),
    tailwindcss(),
    localDevFastHtml(),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mode === 'development' && require('lovable-tagger').componentTagger(),
  ].filter(Boolean),
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
        ws: true,
      },
    },
    watch: {
      ignored: ['**/ARQUIVOS_NAO_USADOS_NO_MOMENTO/**', '**/node_modules/**', '**/.git/**'],
      usePolling: true,
      interval: 300,
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
