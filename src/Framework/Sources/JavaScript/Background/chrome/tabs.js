'use strict';

var eventEmitter = require('../event-bus.js');
var urlMatcher = require('../url-matcher.js');

var tabs = {};

// Internal state management
var browserTabs = { /* id, url */ };
var lastFocusedTabId = null;

function registerTab({tabId, frameId, hasFocus, isVisible, url, status}) {
    if (frameId !== 0) { return; } // TODO: Change to assert? Only top window should send these messages

    if (hasFocus) {
        if (lastFocusedTabId && lastFocusedTabId !== tabId) {
            browserTabs[lastFocusedTabId].hasFocus = false;
        }

        lastFocusedTabId = tabId;
    }

    var tab = {
        id: tabId,
        url,
        hasFocus,
        isVisible,
        status
    };

    if (browserTabs[tabId]) {
        const changeInfo = buildTabChangeInfo(browserTabs[tabId], tab);
        if (Object.keys(changeInfo).length) {
            tabs.onUpdated._emit(tabId, changeInfo, tab);
        }
    } else {
        tabs.onCreated._emit(tab);
        tabs.onUpdated._emit(tabId, {status: "loading"}, tab);
    }

    browserTabs[tabId] = tab;
}

function buildTabChangeInfo(before, after) {
    // https://developer.chrome.com/extensions/tabs#event-onUpdated
    var changeInfo = {};

    if (before.url !== after.url) {
        changeInfo.url = after.url;
        changeInfo.status = "loading";
    }

    if (before.status !== after.status) {
        changeInfo.status = after.status;
    }

    return changeInfo;
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

var listeners = {
    onCreated: [],
    onUpdated: [],
    onRemoved: [],
};

function addListener(type, callback) {
    listeners[type].push(callback);
    eventEmitter.addListener(`tab@${type}`, callback);
}

function removeListener(type, callback) {
    listeners[type] = listeners[type].filter(function(item) {
        if(callback === item) {
            eventEmitter.removeListener(`tab@${type}`, callback);
            return false;
        }
        return true;
    });
}

tabs.onCreated = {
    type: 'onCreated',
    _emit: function() {
        eventEmitter.emit.apply(eventEmitter, [`tab@${this.type}`].concat(Object.values(arguments)));
    },
    addListener: function(listener) {
        addListener(this.type, listener);
    },
    removeListener: function(listener) {
        removeListener(this.type, listener);
    },
    hasListener: function(listener) {
        return listeners[this.type].includes(listener);
    },
}

tabs.onUpdated = Object.assign({}, tabs.onCreated, { type: 'onUpdated' });
tabs.onRemoved = Object.assign({}, tabs.onCreated, { type: 'onRemoved' });

module.exports = tabs;
