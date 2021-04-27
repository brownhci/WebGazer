const path = require('path');
const webpack = require('webpack');
const createVariants = require('parallel-webpack').createVariants;

const bannerString =`
 WebGazer.js: Scalable Webcam EyeTracking Using User Interactions
 Copyright (c) 2016-2020, Brown HCI Group 
 Licensed under GPLv3. Companies with a valuation of less than $1M can use WebGazer.js under LGPLv3.
 `;

function createConfig(options) {
  return {
    entry: './src/index.mjs',
    output: {
      filename: 'webgazer' + 
		(options.target == 'var' ? '' : '.' + options.target) + 
		(options.minified ? '.min' : '') + 
		'.js',
      library: 'webgazer',
      libraryTarget: options.target,
      libraryExport: 'default',
      path: path.resolve(__dirname, 'dist'),
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
    optimization: {
    	minimize: options.minified
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
  minified: [true, false],
  target: ['var','commonjs2']
}, createConfig);
