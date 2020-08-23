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
        if (payload.tabId === 'popup') {
            chrome.runtime.onMessage._emit(payload.message, {
                tab: {},
                frameId: payload.frameId,
                id: 'topee',
                url: payload.url,
                tlsChannelId: undefined
            }, sendResponse);
            return;
        }
    
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
        const keys = payload.message.keys;
        if (keys) {
            chrome.storage.local.get(keys, sendResponse);
        } else {
            chrome.storage.local.get(sendResponse);
        }
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
        if (payload.tabId === 'popup') {
            window.webkit.messageHandlers.popup.postMessage({
                eventName: 'response',
                messageId: payload.messageId,
                payload: response
            });
            return;    
        }

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
