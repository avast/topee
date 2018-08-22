// https://developer.chrome.com/extensions/extension
var runtime = require('./runtime.js');

var extension = {};

extension.getURL = function (path) {
    return runtime.getURL(path);
};

module.exports = extension;
