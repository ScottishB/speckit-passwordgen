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
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    exclude: ['sql.js'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
});
