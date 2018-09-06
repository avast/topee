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
    var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    if (callback) {
        listener.messageId = messageId;  // this is needed for iframe-resources.js communication
        safari.self.addEventListener("message", listener);
    }

    background.dispatchRequest({
        eventName: 'sendMessage',
        frameId: tabInfo.frameId,
        messageId: messageId,
        url: window.location.href,
        message: message
    });

    function listener(event) {
        if (event.name === 'response' && event.message.messageId === messageId) {
            callback(event.message.payload);
            safari.self.removeEventListener("message", listener);
        }
    }
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
    if (event.name === 'request' && (!event.message.frameId || event.message.frameId === tabInfo.frameId)) {
        eventEmitter.emit('message', event.message.payload, {id: 'topee'}, function (message) {
            background.dispatchRequest({
                eventName: 'messageResponse',
                messageId: event.message.messageId,
                message: message
            });
        });
    }
    if (event.name === 'request' && iframesParent.hasChild(event.message.frameId)) {
        iframesParent.forward(event.message.frameId, event.message);
    }
    if (event.name === 'request' && !event.message.frameId) {
        iframesParent.broadcast(event.message);
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
