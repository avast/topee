'use strict';
var eventEmitter = require('../event-bus.js');

var runtime = {
    // Manifest will be updated by Topee SafariExtensionBridge before user
    // background scripts are executed.
    _manifest: undefined
};

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

runtime.getManifest = function () {
    return runtime._manifest;
};

module.exports = runtime;
