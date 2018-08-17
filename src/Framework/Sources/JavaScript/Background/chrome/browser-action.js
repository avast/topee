// https://developer.chrome.com/extensions/browserAction
var eventEmitter = require('../event-bus.js');

var browserAction = {};

var state = {
    popup: {}
};

// TODO: Implementation
browserAction.setTitle = function () {};

// TODO: Implementation (actual display of popup + callback handling is missing)
browserAction.setPopup = function ({tabId, popup}, callback) {
    state.popup = {tabId, popup, callback};
};

// TODO: Implementation
browserAction.setIcon = function () {};

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
