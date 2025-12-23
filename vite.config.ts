import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './src/index.html',
      output: {
        manualChunks: {
          'sql-wasm': ['sql.js'],
        },
      },
    },
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for now (development)
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      // Allow serving files from the argon2-browser package
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['sql.js', 'argon2-browser'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
  worker: {
    format: 'es',
  },
});
