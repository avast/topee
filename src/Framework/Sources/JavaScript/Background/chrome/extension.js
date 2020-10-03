// https://developer.chrome.com/extensions/extension

var extension = {};

extension.getURL = function (path) {
    return chrome.runtime.getURL(path);
};

// TODO: Implementation
extension.getViews = function (/* fetchProperties */) {
    return [];
};

module.exports = extension;
