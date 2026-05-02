import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
const parsedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
const isValidPort = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535;

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    host: process.env.HOST,
    port: isValidPort ? parsedPort : undefined,
    strictPort: isValidPort,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})