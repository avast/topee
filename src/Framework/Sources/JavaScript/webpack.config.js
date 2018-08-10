const path = require('path');

module.exports = {
    entry: {
        'content': './Content/content.js',
        'background': './Background/background.js',
        'iframe-resources': './IframeResources/iframe-resources.js'
    },
    mode: 'none',
    output: {
        filename: 'topee-[name].js',
        path: path.resolve(__dirname, '../../Build')
    }
};
