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
        let keysToFetch = [];
        let defaults = {};
        if (Array.isArray(payload.message.keys)) {
            keysToFetch = payload.message.keys;
        } else if (typeof payload.message.keys === 'string') {
            keysToFetch = [payload.message.keys];
        } else if (typeof payload.message.keys === 'object') {
            keysToFetch = Object.keys(payload.message.keys);
            defaults = payload.message.keys;
        } else {
            throw new Error('invalid type of argument');
        }
        const result = {};
        for (const key of keysToFetch) {
            const inStorage = localStorage.getItem(key);
            result[key] = inStorage ? JSON.decode(inStorage) : defaults[key] || null;
        }
        sendResponse(result);
    }

    if (payload.eventName === 'storage.set') {
        const items = payload.message.items;
        for (const key of Object.keys(items)) {
            localStorage.setItem(key, JSON.stringify(items[key]));
        }
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

window.topee = {
    manageRequest: manageRequest
};
