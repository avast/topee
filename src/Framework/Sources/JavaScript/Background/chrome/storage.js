'use strict';

const tabs = require('./tabs.js');
const EventEmitter = require('events');
const changeEmitter = new EventEmitter();

window._storageData = window._storageData || {};

function storage(storageArea) {
    const STORAGE_KEY_PREFIX = '__topee_internal.' + storageArea + '.';
    function keyName(key) {
        return STORAGE_KEY_PREFIX + key;
    }

    function getAllKeys() {
        return Object.keys(window._storageData)
            .filter(function (key) {
                return key.startsWith(STORAGE_KEY_PREFIX);
            })
            .map(function (key) {
                return key.replace(STORAGE_KEY_PREFIX, '');
            });
    }

    /**
     * @param {string|string[]} keys
     * @param {function} [callbackFunc]
     */
    function remove (keys, callbackFunc) {
        let keysToRemove;
        if (typeof keys === 'string') {
            keysToRemove = [keys];
        } else if (Array.isArray(keys)) {
            keysToRemove = keys;
        } else {
            throw new Error('Invalid "keys" argument type');
        }
        for (const key of keysToRemove) {
            const fullKey = keyName(key);
            window.webkit.messageHandlers.appex.postMessage({
                type: 'chromeStorage',
                key: btoa(encodeURIComponent(fullKey))
            });
            delete window._storageData[fullKey];
        }
        callbackFunc && callbackFunc();
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
                keysToFetch = getAllKeys();
            } else {
                console.log('storage.get keys:', keys);
                throw new Error('storage.getinvalid type of argument: ' + typeof keys);
            }
            const result = {};
            for (const key of keysToFetch) {
                const inStorage = window._storageData[keyName(key)];
                result[key] = inStorage ? JSON.parse(inStorage) : defaults[key] || null;
            }
            callbackFunc(result);
        },
        set(items, callbackFunc) {
            const changes = {};
            for (const key of Object.keys(items)) {
                const oldValue = window._storageData[key] ? JSON.parse(window._storageData[key]) : null;
                const newValue = items[key];
                const fullKey = keyName(key);
                const strValue = JSON.stringify(items[key]);

                changes[key] = { oldValue, newValue };

                if (newValue === undefined) {
                    remove(key);
                    continue;
                }

                window.webkit.messageHandlers.appex.postMessage({
                    type: 'chromeStorage',
                    key: btoa(encodeURIComponent(fullKey)),
                    value: btoa(encodeURIComponent(strValue))
                });
            
                window._storageData[fullKey] = strValue;
            }

            changeEmitter.emit('storage', changes, storageArea);
            tabs.query({}, function(tabs) {
                window.webkit.messageHandlers.popup.postMessage({
                    eventName: 'request',
                    payload: {
                        type: '__topee_storage',
                        changes: changes,
                        area: storageArea
                    }
                });

                tabs.forEach(function (tab) {
                    window.webkit.messageHandlers.content.postMessage({
                        tabId: tab.id,
                        eventName: 'request',
                        payload: {
                            type: '__topee_storage',
                            changes: changes,
                            area: storageArea
                        }
                    });
                });
            });
            callbackFunc && callbackFunc();
        },
        remove,
        /**
         * @param {function} callbackFunc
         */
        clear (callbackFunc) {
            remove(getAllKeys(), callbackFunc);
        },
    };
}

function sessionStorage() {
    const memoryStorage = {};
    function duplicate(data) {
        return JSON.parse(JSON.stringify(data));
    }
    return {
        get: function(keys) {
            const callback = arguments.length > 0 && typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

            if (!keys || typeof keys === 'function') {
                if (callback) {
                    callback(duplicate(memoryStorage));
                    return;
                }
                return Promise.resolve(duplicate(memoryStorage));
            }

            let keysToFetch = [];
            let defaults = {};
            if (Array.isArray(keys)) {
                keysToFetch = keys;
            } else if (typeof keys === 'string') {
                keysToFetch = [keys];
            } else if (typeof keys === 'object') {
                keysToFetch = Object.keys(keys);
                defaults = keys;
            } else {
                console.log('storage.get keys:', keys);
                throw new Error('storage.getinvalid type of argument: ' + typeof keys);
            }
            const result = {};
            for (const key of keysToFetch) {
                const keyData = memoryStorage[key] || defaults[key];
                result[key] = keyData !== null && typeof keyData != 'undefined' ? duplicate(keyData) : null;
            }
            if (callback) {
                callback(result);
                return;
            }
            return Promise.resolve(result);
        },
        set: function(items, cb) {
            const changes = {};
            for (const key of Object.keys(items)) {
                // no need to duplicate because we are throwing it away anyway
                const oldValue = typeof memoryStorage[key] !== 'undefined' ? memoryStorage[key] : null;
                const newValue = items[key];

                changes[key] = { oldValue, newValue };

                if (newValue === undefined) {
                    delete memoryStorage[key];
                }
                else {
                    memoryStorage[key] = duplicate(items[key]);
                }
            }

            changeEmitter.emit('storage', changes, 'session');

            if (cb) {
                cb();
                return;
            }
            return Promise.resolve();
        },
        remove: function(keys, cb) {
            let keysToRemove;
            if (typeof keys === 'string') {
                keysToRemove = [keys];
            } else if (Array.isArray(keys)) {
                keysToRemove = keys;
            } else {
                throw new Error('Invalid "keys" argument type');
            }

            for (const key of keysToRemove) {
                delete memoryStorage[key];
            }

            if (cb) {
                cb();
                return;
            }
            return Promise.resolve();
        },
        clear: function(cb) {
            for (const key in memoryStorage) {
                delete memoryStorage[key];
            }
            if (cb) {
                cb();
                return;
            }
            return Promise.resolve();
        }
    };
}

module.exports = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    session: sessionStorage(),
    onChanged: {
        addListener(callback) {
            changeEmitter.on('storage', callback);
        },
        removeListener(callback) {
            changeEmitter.off('storage', callback);
        }
    }
};
