const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    library: 'mogol',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
};
