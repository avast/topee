const path = require('path');

module.exports = {
    entry: {
        content: './Content/content.js',
        background: './Background/background.js'
    },
    mode: 'none',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, '../../Build')
    }
};
