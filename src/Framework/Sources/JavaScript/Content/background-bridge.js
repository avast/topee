// Low-level communication bridge with background script

var tabInfo = require('./tabInfo.js');

var bridge = {};

function dispatchRequest(tabId, payload, callback) {
    var messageId = payload.messageId || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    if (callback) {
        listener.messageId = messageId;  // this is needed for iframe-resources.js communication
        safari.self.addEventListener('message', listener);
    }

    payload.tabId = tabId;
    payload.messageId = messageId;
    payload.frameId = tabInfo.frameId;
    payload.url = window.location.href;

    safari.extension.dispatchMessage('request', {
        tabId: tabId,
        payload: payload
    });

    function listener(event) {
        if (event.name === 'response' && event.message.messageId === messageId) {
            callback(event.message.payload);
            safari.self.removeEventListener('message', listener);
        }
    }
}

bridge.dispatchRequest = function(payload, callback) {
    tabInfo.tabId.then(tabId => {
        dispatchRequest(tabId, payload, callback);
    });
};

tabInfo.tabId.then(tabId => {
    bridge.dispatchRequest = function (payload, callback) {
        dispatchRequest(tabId, payload, callback);
    };
});

module.exports = bridge;
