'use strict';

// not sure if our local storage is isolated, so better use key prefixing
function keyName(key) {
    return '__topee_internal.' + key;
}

var storage = {
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
            keysToFetch = Object.keys(localStorage);
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

const onChangeListeners = [];

module.exports = {
    local: storage,
    sync: storage,
    managed: {
        get() {
            return new Promise(function (resolve) {
                resolve({});
                // reject(new Error('managed store is not supported'));
            });
        }
    },
    onChanged: {
        addListener(callback) {
            onChangeListeners.push(callback);
        },
    },
};
