//
//  Copyright © 2018 Avast. All rights reserved.
//
window.chrome = require('./chrome/index.js');

function manageRequest(stringifiedPayload) {
    var payload = JSON.parse(stringifiedPayload);
    var message = payload.message;

    chrome.runtime.onMessage._emit(payload.message, {id: 'topee', url: payload.url, tlsChannelId: undefined }, sendResponse);

    function sendResponse(response) {
        window.webkit.messageHandlers.content.postMessage({
            tabId: payload.tabId,
            messageId: payload.messageId,
            response: response
        });
    }
}

window.topee = {
    manageRequest: manageRequest
};

window.webkit.messageHandlers.appex.postMessage({ type: "ready" })

// TODO: move to demo
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendResponse("background pong #" + message.value);
});
