// https://developer.chrome.com/extensions/browserAction
var eventEmitter = require('../event-bus.js');

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
    addListener: function (fn) {
        eventEmitter.addListener('toolbarItemClicked', function (event) {
            // Only call fn if popup isn't defined
            if (!state.popup.popup) {
                // TODO: Also check tabId
                fn(event.tab);
            }
        });
    }
};

module.exports = browserAction;
