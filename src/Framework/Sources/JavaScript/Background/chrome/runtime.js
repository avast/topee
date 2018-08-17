'use strict';
var eventEmitter = require('../event-bus.js');

var runtime = {};

runtime.onMessage = {
    addListener: function (listener) {
        eventEmitter.addListener('message', listener);
    },
    removeListener: function (listener) {
        eventEmitter.removeListener('message', listener);
    },

    _emit: function(message, sender, sendResponse) {
        eventEmitter.emit('message', message, sender, sendResponse);
    }
};

runtime.onUpdateAvailable = {
    addListener: function () {
        // Not available in Safari
    }
};

var manifest = {};
window.webkit.messageHandlers.appex.postMessage({type: "getManifest"});
eventEmitter.once('extensionManifest', function (event) {
    manifest = event.manifest;
});
    
runtime.getManifest = function () {
    return manifest;
};

module.exports = runtime;
