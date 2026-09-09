import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base '/lista-compras/' no GitHub Pages, '/' no dev local
const base = process.env.GITHUB_PAGES === 'true' ? '/lista-compras/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: { port: 5848, strictPort: true, host: true },
  preview: { port: 5848, strictPort: true },
})
