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
    entry: './src/index.js',
    output: {
      filename: `webgazer.${options.target}.js`,
      library: 'webgazer',
      libraryTarget: options.target,
      libraryExport: 'default',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: 'babel-loader'
        }
      ]
    },
    plugins: [
      new webpack.BannerPlugin(bannerString),
    ],
    devtool: "source-map"
  };
}
module.exports = createVariants({
  target: ['var', 'commonjs2', 'umd', 'amd']
}, createConfig);
