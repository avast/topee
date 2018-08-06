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

// TODO: Implementation
runtime.getManifest = function () {
    return {
        name: 'MyExtension',
        version: '0.0.1'
    };
};

module.exports = runtime;
