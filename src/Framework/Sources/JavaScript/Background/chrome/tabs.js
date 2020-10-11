'use strict';

var eventEmitter = require('../event-bus.js');
var urlMatcher = require('../url-matcher.js');

var tabs = {};

// Internal state management
var browserTabs = { /* id, url */ };
var lastFocusedTabId = null;

function registerTab({tabId, frameId, hasFocus, isVisible, url, status}) {
    if (frameId !== 0) { return; } // TODO: Change to assert? Only top window should send these messages

    var emitActivated = false;
    if (hasFocus) {
        if (lastFocusedTabId && lastFocusedTabId !== tabId) {
            browserTabs[lastFocusedTabId].hasFocus = false;
        }

        lastFocusedTabId = tabId;
        emitActivated = true;
    }

    var tab = {
        id: tabId,
        url,
        hasFocus,
        isVisible,
        status
    };

    if (browserTabs[tabId]) {
        var changeInfo = buildTabChangeInfo(browserTabs[tabId], tab);
        if (Object.keys(changeInfo).length) {
            tabs.onUpdated._emit(tabId, changeInfo, tab);
        }
    } else {
        tabs.onCreated._emit(tab);
        tabs.onUpdated._emit(tabId, {status: "loading"}, tab);
    }

    browserTabs[tabId] = tab;

    if (emitActivated) {
        tabs.onActivated._emit({ tabId: tabId });
    }
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
    if (!browserTabs[payload.tabId]) {
        console.log('closing an undetected tab', payload.tabId);
        return;
    }
    browserTabs[payload.tabId]._deleted = true;
    setTimeout(function () {
        if (browserTabs[payload.tabId]._deleted) {
            delete browserTabs[payload.tabId];

            if (lastFocusedTabId === payload.tabId) {
                lastFocusedTabId = null;
            }
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

let unsupportedQueryWarning = [ 'pinned', 'audible', 'muted', 'highlighted', 'discarded', 'autoDiscardable', 'currentWindow', 'status', 'title', 'windowId', 'windowType', 'index' ]
    .reduce(function (w, opt) {
        w[opt] = function () {
            console.error('chrome.tabs.query "' + opt + '" option is not supported');
            delete unsupportedQueryWarning[opt];
        };
        return w;
    }, {});
unsupportedQueryWarning.active = function (opts) {
    if (!opts.lastFocusedWindow) {
        console.error('chrome.tabs.query "active" option is only valid in a conjunction with "lastFocusedWindow"');
        delete unsupportedQueryWarning.active;
    }
};


function query(queryInfo, callback) {
    for (var opt in queryInfo) {
        if (unsupportedQueryWarning[opt]) {
            unsupportedQueryWarning[opt](queryInfo);
        }
    }

    var tabs = [];
    for (var tab in browserTabs) {
        tabs.push(browserTabs[tab]);
    }

    // URL filtering
    if (queryInfo.url) {
        tabs = tabs.filter(function (tab) {
            return urlMatcher.match(queryInfo.url, tab.url);
        });
    }

    // Active tab (in last focussed window) filter
    if (queryInfo.active) {
        tabs = tabs.filter(function (tab) {
            return tab.id === lastFocusedTabId;
        });
    }

    if (tabs.length === 0 && Object.keys(browserTabs).length === 0 && !queryInfo.url) {
        // no tab opened
        tabs = [{
            id: 0,
            url: 'favorites://',
            hasFocus: true,
            isVisible: true,
            status: 'complete'
    
        }];
    }

    callback(tabs);
}

// when chrome.tabs.query is called before the background script finishes loading,
// query would propagate faster than hello and return nothing
tabs.query = function(queryInfo, callback) {
    setTimeout(function () {
        query(queryInfo, callback);
        tabs.query = query;
    }, 0);
};

// this could be implement in SafariExtensionBridge.swift,
// but SFSafariPage.getContainingTab only exists since 10.14 and Topee targets 10.11
tabs.update = function(tabId, updateProperties, callback) {
   if (!updateProperties.url) {
       console.error('chrome.tabs.update only supports url parameter');
   }
   window.webkit.messageHandlers.content.postMessage({
       eventName: 'tabUpdate',
       tabId: tabId,
       frameId: 0,
       url: updateProperties.url
   });
   setTimeout(function () {
       callback({ id: tabId, url: updateProperties.url });
   }, 0); 
};

eventEmitter.addListener('tabs.query', function (message) {
    tabs.query(message.queryInfo, function (tabs) {
        if (message.tabId === 'popup') {
            window.webkit.messageHandlers.popup.postMessage({
                eventName: 'response',
                messageId: message.messageId,
                payload: tabs
            });
            return;
        }
        
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

tabs.create = function(createProperties, callback) {
    window.webkit.messageHandlers.appex.postMessage({
        type: 'createTab',
        url: typeof createProperties.url === 'undefined' ? 'favorites://' : createProperties.url,
        active: typeof createProperties.active === 'undefined' ? true : createProperties.active
    });

    if (callback) {
        eventEmitter.addListener('hello', onTabCreated);
        eventEmitter.addListener('alive', onTabCreated);
    }

    function onTabCreated({tabId}) {
        setTimeout(function () {
            tabs.get(tabId, callback);
        }, 0);

        eventEmitter.removeListener('alive', onTabCreated);
        eventEmitter.removeListener('hello', onTabCreated);
    }
};

tabs.remove = function(id, callback) {
    window.webkit.messageHandlers.appex.postMessage({
        type: 'removeTab',
        tabId: id
    });
    if (callback) {
        setTimeout(callback, 0);
    }
};

tabs.sendMessage._emit = function (payload) {
    eventEmitter.emit('messageResponse', payload);
};

var listeners = {
    onCreated: [],
    onUpdated: [],
    onRemoved: [],
    onActivated: []
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
        eventEmitter.emit.apply(eventEmitter, [`tab@${this.type}`].concat(Array.prototype.slice.call(arguments)));
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
};

tabs.onUpdated = Object.assign({}, tabs.onCreated, { type: 'onUpdated' });
tabs.onRemoved = Object.assign({}, tabs.onCreated, { type: 'onRemoved' });
tabs.onActivated = Object.assign({}, tabs.onCreated, { type: 'onActivated' });

module.exports = tabs;
