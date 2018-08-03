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

module.exports = runtime;
