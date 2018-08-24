'use strict';

var EventEmitter = require('events');
var tabInfo = require('../tabInfo.js');
var iframesParent = require('../iframes.js');

var runtime = {};

var eventEmitter = new EventEmitter();

// We are adding quite a few listeners so let's increase listeners limit. Otherwise we get following warning:
// (node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.
eventEmitter.setMaxListeners(1024);

var dispatchRequest = function(payload) {
    tabInfo.tabId.then(tabId => {
        payload.tabId = tabId;
        safari.extension.dispatchMessage('request', {
            tabId: tabId,
            payload: payload
        });
    });
};

tabInfo.tabId.then(tabId => {
    dispatchRequest = function (payload) {
        payload.tabId = tabId;
        safari.extension.dispatchMessage('request', {
            tabId: tabId,
            payload: payload
        });
    };
});

runtime.sendMessage = function(message, callback) {
    var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    if (callback) {
        listener.messageId = messageId;  // this is needed for iframe-resources.js communication
        safari.self.addEventListener("message", listener);
    }

    dispatchRequest({
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
        tabInfo.tabId.then(tabId => {
            eventEmitter.emit('message', event.message.payload, {id: 'topee'}, function (message) {
                safari.extension.dispatchMessage('request', {
                    tabId: tabId,
                    payload: JSON.stringify({
                        tabId: tabId,
                        eventName: 'messageResponse',
                        frameId: tabInfo.frameId,
                        messageId: event.message.messageId,
                        url: window.location.href,
                        message: message
                    })
                });
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

module.exports = runtime;
