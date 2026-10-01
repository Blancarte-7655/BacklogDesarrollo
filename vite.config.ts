import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5190,
    strictPort: true,
    // La API (server/) corre en el puerto 4590 durante el desarrollo (API_PORT en .env)
    // xfwd: la API recibe la IP real de quien abre la app (para la restricción por red del campus)
    proxy: { '/api': { target: 'http://127.0.0.1:4590', xfwd: true } },
  },
})
