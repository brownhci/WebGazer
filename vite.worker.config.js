import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/ridgeWorker.worker.ts'),
      formats: ['es'],
      fileName: () => 'ridgeWorker.worker.js'
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    watch: process.argv.includes('--watch')
      ? {
        include: ['src/ridgeWorker.worker.ts', 'src/worker_scripts']
      }
      : false
  }
}));
