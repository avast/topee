'use strict';

var EventEmitter = require('events');
var tabInfo = require('../tabInfo.js');
var iframesParent = require('../iframes.js');
var background = require('../background-bridge.js');

var runtime = {};

var eventEmitter = new EventEmitter();

// We are adding quite a few listeners so let's increase listeners limit. Otherwise we get following warning:
// (node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.
eventEmitter.setMaxListeners(1024);

runtime.sendMessage = function(message, callback) {
    background.dispatchRequest({
        eventName: 'sendMessage',
        message: message
    }, callback);
};

runtime.onMessage = {
    addListener: function(callback) {
        eventEmitter.addListener('message', function (message, sender, sendResponse) {
            callback(message, sender, sendResponse);
        });
    },
    removeListener: function(callback) {
        eventEmitter.removeListener('message', callback);
    }
};

safari.self.addEventListener("message", function (event) {
    // message from the background script and a response
    if (event.name === 'request' && tabInfo.isForThisFrame(event.message.frameId)) {
        eventEmitter.emit('message', event.message.payload, {id: 'topee'}, function (message) {
            background.dispatchRequest({
                eventName: 'messageResponse',
                messageId: event.message.messageId,
                message: message
            });
        });
        return;
    }
    if (event.name === 'request' && iframesParent.hasChild(event.message.frameId)) {
        iframesParent.forward(event.message.frameId, event.message);
        return;
    }
    if (event.name === 'request' && typeof event.message.frameId === 'undefined') {
        iframesParent.broadcast(event.message);
        return;
    }
});

runtime.getURL = function (path) {
    if (!safari.extension.baseURI) {
        // Sometimes this happens (on first page load after XCode build & run)
        throw new Error('safari.extension.baseURI didn\'t return usable value');
    }

    return safari.extension.baseURI + path;
};

runtime.getPlatformInfo = function (fn) {
    fn({
        os: 'mac',
        arch: 'x86-64',
        nacl_arch: 'x86-64'
    });
};

module.exports = runtime;
