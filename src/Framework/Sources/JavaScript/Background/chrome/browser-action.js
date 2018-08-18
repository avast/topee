// https://developer.chrome.com/extensions/browserAction
var eventEmitter = require('../event-bus.js');

var browserAction = {};

var state = {
    popup: {}
};

// TODO: Implementation
browserAction.setTitle = function () {
    console.debug('TODO: chrome.browserAction.setTitle ' + JSON.stringify([...arguments], 2));
};

// TODO: Implementation (actual display of popup + callback handling is missing)
browserAction.setPopup = function ({tabId, popup}, callback) {
    state.popup = {tabId, popup, callback};
};

browserAction.setIcon = function (details) {
    window.webkit.messageHandlers.appex.postMessage({type: 'setIcon', details});
};

browserAction.onClicked = {
    addListener: function (fn) {
        eventEmitter.addListener('toolbarItemClicked', function () {
            // Only call fn if popup isn't defined
            if (!state.popup.popup) {
                // TODO: Also check tabId
                fn();
            }
        });
    }
};

module.exports = browserAction;
