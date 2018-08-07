'use strict';

var eventEmitter = require('../event-bus.js');
var urlMatcher = require('../url-matcher.js');

var tabs = {};

// Internal state management
var browserTabs = {};

eventEmitter.addListener('hello', function (payload) {
    if (payload.frameId !== 0) { return; }
    browserTabs[payload.tabId] = {
        id: payload.tabId,
        url: payload.url
    };
});

eventEmitter.addListener('bye', function (payload) {
    if (typeof payload.frameId !== 'undefined' && payload.frameId !== 0) { return; }
    delete browserTabs[payload.tabId];
});

// chrome.tabs API
tabs.sendMessage = function (tabId, message, options, responseCallback) {
    var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    if (typeof options === 'function') {
        responseCallback = options;
    }

    if (responseCallback) {
        eventEmitter.addListener('messageResponse', onResponse);
    }

    window.webkit.messageHandlers.content.postMessage({
        tabId: tabId,
        eventName: 'request',
        frameId: (options && options.frameId) || undefined,
        messageId: messageId,
        payload: message
    });

    function onResponse(payload) {
        if (payload.messageId === messageId) {
            responseCallback(payload.message);
            eventEmitter.removeListener('messageResponse', onResponse);
        }
    }
};

tabs.query = function(queryInfo, callback) {
    var tabs = [];
    for (var tab in browserTabs) {
        tabs.push(browserTabs[tab]);
    }
    if (queryInfo.url) {
        tabs = tabs.filter(tab => urlMatcher.match(queryInfo.url, tab.url));
    }
    callback(tabs);
};

tabs.sendMessage._emit = function (payload) {
    eventEmitter.emit('messageResponse', payload);
};

tabs.onUpdated = {
    // TODO: Implementation
    addListener: function () {}
};

module.exports = tabs;
