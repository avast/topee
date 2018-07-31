const path = require('path');

module.exports = {
  entry: './Content/script.js',
  mode: 'none',
  output: {
    filename: 'content.js',
    path: path.resolve(__dirname, '../../Build')
  }
};
