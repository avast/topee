//
//  Copyright © 2018 Avast. All rights reserved.
//
require('../Common/polyfills');

var logging = require('./logging');
logging.setup();

var eventEmitter = require('./event-bus.js');

window.chrome = require('./chrome/index.js');

var serviceEvents = ['hello', 'alive', 'bye', 'activeTabId', 'extensionManifest', 'toolbarItemClicked', 'tabs.query'];

function manageRequest(payload) {
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

    if (payload.eventName === 'storage.get') {
        chrome.storage.local.get(payload.message.keys, function (result) {
            return sendResponse(result);
        });
    }

    if (payload.eventName === 'storage.onChanged') {
        chrome.storage.onChanged.addListener(function (keys) {
            return sendToTab(payload.tabId, 'storage.onChanged', payload.listenerId, keys);
        });
    }

    if (payload.eventName === 'storage.set') {
        chrome.storage.local.set(payload.message.items);
        sendResponse();
    }

    if (serviceEvents.includes(payload.eventName)) {
        eventEmitter.emit(payload.eventName, payload);
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

// can be reused for sendResponse function above,
// but there is no benefits atm because it requires refactoring (messageId -> listenerId)
function sendToTab(tabId, eventName, listenerId, payload) {
    window.webkit.messageHandlers.content.postMessage({
        tabId,
        eventName,
        listenerId,
        payload
    });
}

window.topee = {
    manageRequest: manageRequest
};
