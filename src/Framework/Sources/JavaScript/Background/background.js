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
            eventName: 'response',
            messageId: payload.messageId,
            payload: response
        });
    }
}

window.topee = {
    manageRequest: manageRequest
};
