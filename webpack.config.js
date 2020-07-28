const path = require('path');
const createVariants = require('parallel-webpack').createVariants;

function createConfig(options) {
  return {
    entry: './src/index.js',
    output: {
      filename: `webgazer.${options.target}.js`,
      library: 'webgazer',
      libraryTarget: options.target,
      libraryExport: 'default',
      path: path.resolve(__dirname, 'dist')
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: 'babel-loader'
        }
      ]
    }
  };
}
module.exports = createVariants({
  target: ['var', 'commonjs2', 'umd', 'amd']
}, createConfig);
