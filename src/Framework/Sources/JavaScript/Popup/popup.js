require('../Common/polyfills');
var EventEmitter = require('events');
var replyBus = new EventEmitter();

window.chrome = require('./chrome/index.js');


// a popup sender in background onMessage looks like
// id: "<extension id>"
// origin: "chrome-extension://<extension id>"
// url: "<full native popup url>"

function dispatchRequest(ignored_tabId, payload, callback) {
    var messageId = payload.messageId || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    if (callback) {
        replyBus.once(messageId, callback);
    }

    payload.tabId = 'popup';  // the extension id would go here if we had one
    payload.messageId = messageId;
    payload.frameId = 0;
    payload.url = window.location.href;

    window.webkit.messageHandlers.background.postMessage({ message: payload });
}

function manageRequest(payload) {
    if (payload.eventName === 'response') {
        replyBus.emit(payload.messageId, payload.payload)
        return;
    }
}

window.topee = {
    dispatchRequest: dispatchRequest,
    manageRequest: manageRequest
};
