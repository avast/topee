'use strict';

var eventEmitter = require('../event-bus.js');
var urlMatcher = require('../url-matcher.js');

var tabs = {};

// Internal state management
var browserTabs = { /* id, url */ };
var lastFocusedTabId = null;

function registerTab({tabId, frameId, hasFocus, isVisible, url}) {
    if (frameId !== 0) { return; } // TODO: Change to assert? Only top window should send these messages

    if (hasFocus) {
        if (lastFocusedTabId && lastFocusedTabId !== tabId) {
            browserTabs[lastFocusedTabId].hasFocus = false;
        }

        lastFocusedTabId = tabId;
    }

    browserTabs[tabId] = {
        id: tabId,
        url,
        hasFocus,
        isVisible
    };
}

eventEmitter.addListener('hello', registerTab);
eventEmitter.addListener('alive', registerTab);

eventEmitter.addListener('bye', function (payload) {
    if (typeof payload.frameId !== 'undefined' && payload.frameId !== 0) { return; }
    browserTabs[payload.tabId]._deleted = true;
    setTimeout(function () {
        if (browserTabs[payload.tabId]._deleted) {
            delete browserTabs[payload.tabId];
        }
    }, 700);  // content.js revokes bye if still alive 500ms later. adding 200 ms margin
});

// chrome.tabs API
tabs.sendMessage = function (tabId, message, options, responseCallback) {
    var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    options = options || {};

    if (typeof options === 'function') {
        responseCallback = options;
        options = {};
    }

    if (responseCallback) {
        eventEmitter.addListener('messageResponse', onResponse);
    }

    window.webkit.messageHandlers.content.postMessage({
        tabId: tabId,
        eventName: 'request',
        frameId: options.frameId,
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
    // TODO: Validate supported queryInfo options

    var tabs = [];
    for (var tab in browserTabs) {
        tabs.push(browserTabs[tab]);
    }

    // URL filtering
    if (queryInfo.url) {
        tabs = tabs.filter(tab => urlMatcher.match(queryInfo.url, tab.url));
    }

    // Active tab (in last focussed window) filter
    if (queryInfo.active && queryInfo.lastFocusedWindow) {
        callback(tabs.filter(tab => tab.id === lastFocusedTabId));
    } else {
        callback(tabs);
    }

};

eventEmitter.addListener('tabs.query', function (message) {
    tabs.query(message.queryInfo, function (tabs) {
        window.webkit.messageHandlers.content.postMessage({
            eventName: 'response',
            tabId: message.tabId,
            frameId: message.frameId,
            messageId: message.messageId,
            payload: tabs
        });
    });
});

tabs.get = function(id, callback) {
    callback(browserTabs[id]);
};

tabs.sendMessage._emit = function (payload) {
    eventEmitter.emit('messageResponse', payload);
};

tabs.onUpdated = {
    // TODO: Implementation
    addListener: function () {}
};

module.exports = tabs;
