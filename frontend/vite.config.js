import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // This tells Vite to accept connections from outside of localhost
    allowedHosts: [
      "bitecheck-app.loca.lt", // <--- Your permanent URL!
    ],
  },
});
