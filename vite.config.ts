import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Shim process.env to prevent "process is not defined" errors in browser
    'process.env': {}
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});