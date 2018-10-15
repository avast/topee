// https://developer.chrome.com/extensions/browserAction
var eventEmitter = require('../event-bus.js');
var tabs = require('./tabs.js');

var browserAction = {};

var state = {
    popup: {}
};

browserAction.setTitle = function ({title, tabId}) {
    window.webkit.messageHandlers.appex.postMessage({type: 'setIconTitle', title, tabId});
};

// TODO: Implementation (actual display of popup + callback handling is missing)
browserAction.setPopup = function ({tabId, popup}, callback) {
    state.popup = {tabId, popup, callback};
};

browserAction.setIcon = function ({path, imageData, tabId}) {
    window.webkit.messageHandlers.appex.postMessage({type: 'setIcon', path, imageData, tabId});
};

browserAction.onClicked = {
    listeners: [],
    addListener: function (fn) {
        var callback = function (event) {
            // Only call fn if popup isn't defined
            if (!state.popup.popup) {
                // TODO: Also check tabId
                tabs.get(event.tab.id, tab => fn(tab));
            }
        };

        browserAction.onClicked.listeners.push({fn: fn, callback: callback});

        eventEmitter.addListener('toolbarItemClicked', callback);
    },
    removeListener: function(fn) {
        browserAction.onClicked.listeners = browserAction.onClicked.listeners.filter(function(item) {
            if(item.fn === fn) {
                eventEmitter.removeListener('toolbarItemClicked', item.callback);
                return false;
            }

            return true;
        });
    },
};

module.exports = browserAction;
