import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Plugin to write _redirects after build
function netlifyRedirects() {
  return {
    name: 'netlify-redirects',
    closeBundle() {
      fs.writeFileSync(resolve(__dirname, 'dist/_redirects'), '/* /index.html 200\n')
    }
  }
}

export default defineConfig({
  plugins: [react(), netlifyRedirects()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})