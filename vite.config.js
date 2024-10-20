import { resolve } from 'path';
import { defineConfig } from 'vite';
import banner from 'vite-plugin-banner';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const bannerString = `
 WebGazer.js: Democratizing Webcam Eye Tracking on the Browser
 Copyright (c) 2016, Brown WebGazer Team
 Licensed under GPLv3. Companies with a valuation of less than $1M can use WebGazer.js under LGPLv3.
 `;

export default defineConfig({
  root: 'www',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'webgazer',
      formats: ['es', 'cjs'],
      fileName: (format) => `webgazer.${format}.js`
    },
    sourcemap: true,
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    },
    minify: 'terser',
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: false
    }
  },
  plugins: [
    banner(bannerString),
    {
      name: 'create-symlinks',
      async closeBundle () {
        try {
          // Run tsc to generate type declarations
          await execAsync('tsc --emitDeclarationOnly --declaration --outDir dist/types');
          await execAsync('node scripts/create-symlink.mjs');
        } catch (error) {
          console.error('Error in closeBundle:', error);
        }
      }
    }
  ],
  server: {
    port: 8080,
    open: true,
    watch: {
      include: ['src/**', 'www/**']
    }
  }
});
