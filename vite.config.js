import { resolve } from 'path'
import { defineConfig } from 'vite'
import banner from 'vite-plugin-banner'
import { copyFileSync } from 'node:fs'

const bannerString = `
 WebGazer.js: Democratizing Webcam Eye Tracking on the Browser
 Copyright (c) 2016, Brown WebGazer Team
 Licensed under GPLv3. Companies with a valuation of less than $1M can use WebGazer.js under LGPLv3.
 `

/**
 * Make a copy of the build bundle to www folder
 */
 const copyToWww = () =>{
  return {
    name: 'copy-to-www',
    apply: 'build',
    writeBundle() {
      copyFileSync(resolve(__dirname, 'dist/webgazer.js'), resolve(__dirname, 'www/webgazer.js'))
      copyFileSync(resolve(__dirname, 'dist/webgazer.js.map'), resolve(__dirname, 'www/webgazer.js.map'))
      copyFileSync(resolve(__dirname, 'dist/webgazer.js'), resolve(__dirname, 'www/data/src/webgazer.js'))
      copyFileSync(resolve(__dirname, 'dist/webgazer.js.map'), resolve(__dirname, 'www/data/src/webgazer.js.map'))
    }
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.mjs'),
      name: 'webgazer',
      fileName: 'webgazer'
    },
    sourcemap: true
  },
  plugins: [banner(bannerString), copyToWww()]
})
