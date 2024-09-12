import { resolve } from 'path'
import { defineConfig } from 'vite'
import banner from 'vite-plugin-banner'

const bannerString = `
 WebGazer.js: Democratizing Webcam Eye Tracking on the Browser
 Copyright (c) 2016, Brown WebGazer Team
 Licensed under GPLv3. Companies with a valuation of less than $1M can use WebGazer.js under LGPLv3.
 `

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.mjs'),
      name: 'webgazer',
      fileName: 'webgazer'
    },
    sourcemap: true
  },
  plugins: [banner(bannerString)]
})
