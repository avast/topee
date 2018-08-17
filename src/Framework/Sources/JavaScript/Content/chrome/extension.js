// https://developer.chrome.com/extensions/extension

var extension = {};

extension.getURL = function (path) {
    return safari.extension.baseURI + path;
};

module.exports = extension;
