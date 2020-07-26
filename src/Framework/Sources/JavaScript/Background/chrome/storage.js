'use strict';

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
                    .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
                    .map(key => key.replace(STORAGE_KEY_PREFIX, ''));
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
            for (const cb of onChangeListeners) {
                // because only local is supported we can hardcode areaName = local
                cb(changes, 'local');
            }
        }
    };
}

const onChangeListeners = [];

module.exports = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    onChanged: {
        addListener(callback) {
            onChangeListeners.push(callback);
        },
    },
};
