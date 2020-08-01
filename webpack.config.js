const path = require('path');
const webpack = require('webpack');
const createVariants = require('parallel-webpack').createVariants;

const bannerString =`
 WebGazer.js: Scalable Webcam EyeTracking Using User Interactions
 Copyright (c) 2016-2020, Brown HCI Group 
 Licensed under GPLv3. Companies with a valuation of less than $10M can use WebGazer.js under LGPLv3.
 `;

function createConfig(options) {
  return {
    entry: './src/index.mjs',
    output: {
      filename: `webgazer.${options.target}.js`,
      library: 'webgazer',
      libraryTarget: options.target,
      libraryExport: 'default',
      path: path.resolve(__dirname, 'dist2'),
    },
    module: {
      rules: [
        {
          test: /\.mjs$/,
          type: 'javascript/esm',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: [".mjs", ".webpack.js", ".web.js", ".js", ".json"]
    },
    plugins: [
      new webpack.BannerPlugin(bannerString),
    ],
    devtool: "source-map"
  };
}
module.exports = createVariants({
  target: ['var','commonjs2']
}, createConfig);
