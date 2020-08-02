'use strict';

const tabs = require('./tabs.js');
const EventEmitter = require('events');
const changeEmitter = new EventEmitter();

function storage(storageArea) {
    const STORAGE_KEY_PREFIX = '__topee_internal.' + storageArea + '.';
    function keyName(key) {
        return STORAGE_KEY_PREFIX + key;
    }

    return {
        /**
         * @param keys (optional)
         * @param cb function
         */
        get (keys, cb) {
            const callbackFunc = cb || keys;
            let keysToFetch = [];
            let defaults = {};
            if (Array.isArray(keys)) {
                keysToFetch = keys;
            } else if (typeof keys === 'string') {
                keysToFetch = [keys];
            } else if (typeof keys === 'object') {
                keysToFetch = Object.keys(keys);
                defaults = keys;
            } else if (typeof keys === 'function') {
                // @todo tests
                keysToFetch = Object.keys(localStorage)
                    .filter(function (key) {
                        return key.startsWith(STORAGE_KEY_PREFIX);
                    })
                    .map(function (key) {
                        return key.replace(STORAGE_KEY_PREFIX, '');
                    });
            } else {
                console.log('storage.get keys:', keys);
                throw new Error('storage.getinvalid type of argument: ' + typeof keys);
            }
            const result = {};
            for (const key of keysToFetch) {
                const inStorage = localStorage.getItem(keyName(key));
                result[key] = inStorage ? JSON.parse(inStorage) : defaults[key] || null;
            }
            callbackFunc(result);
        },
        set(items) {
            const changes = {};
            for (const key of Object.keys(items)) {
                const oldValue = localStorage.getItem(key);
                const newValue = items[key];
                localStorage.setItem(keyName(key), JSON.stringify(items[key]));
                changes[key] = { oldValue, newValue };
            }

            changeEmitter.emit('storage', changes, storageArea);
            tabs.query({}, function(tabs) {
                tabs.forEach(function (tab) {
                    window.webkit.messageHandlers.content.postMessage({
                        tabId: tab.id,
                        eventName: 'request',
                        // @todo are these realy needed
                        // frameId: options.frameId,
                        // messageId: messageId,
                        payload: {
                            type: '__topee_storage',
                            changes: changes,
                            area: storageArea
                        }
                    });
                });
            });
        }
    };
}


module.exports = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    onChanged: {
        addListener(callback) {
            changeEmitter.on('storage', callback);
        },
        removeListener(callback) {
            changeEmitter.off('storage', callback);
        }
    }
};
