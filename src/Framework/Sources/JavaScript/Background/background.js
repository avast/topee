//
//  Copyright © 2018 Avast. All rights reserved.
//

var logging = require('./logging');
logging.setup();

var eventEmitter = require('./event-bus.js');

window.chrome = require('./chrome/index.js');

function manageRequest(stringifiedPayload) {
    var payload = JSON.parse(stringifiedPayload);

    if (payload.eventName === 'sendMessage') {
        chrome.tabs.get(payload.tabId, function (tab) {
            if (!tab) {  // should not happen
                tab = { id: payload.tabId };
            }
            chrome.runtime.onMessage._emit(payload.message, {
                tab: tab,
                frameId: payload.frameId,
                id: 'topee',
                url: payload.url,
                tlsChannelId: undefined
            }, sendResponse);
        });
        return;
    }
    if (payload.eventName === 'messageResponse') {
        chrome.tabs.sendMessage._emit(payload);
        return;
    }
    if (payload.eventName === 'hello') {
        eventEmitter.emit('hello', payload);
    }
    if (payload.eventName === 'bye') {
        eventEmitter.emit('bye', payload);
    }
    if (payload.eventName === 'activeTabId') {
        eventEmitter.emit('activeTabId', payload);
    }

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
