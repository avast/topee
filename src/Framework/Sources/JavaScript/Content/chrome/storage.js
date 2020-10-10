
'use strict';

const background = require('../background-bridge');
const EventEmitter = require('events');
const changeEmitter = new EventEmitter();

function storage(storageArea) {
    return {
        /**
         * @param keys (optional)
         * @param cb function
         */
        get (keys, cb) {
            const callback = cb || keys;
            background.dispatchRequest(
                {
                    eventName: 'storage.get',
                    message: {
                        area: storageArea,
                        keys: cb ? keys : undefined
                    }
                },
                (resp) => callback(resp)
            );
        },
        set(items,callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.set',
                    message: {
                        area: storageArea,
                        items
                    }
                },
                () => callback()
            );
        },
        remove(keys, callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.remove',
                    message: {
                        area: storageArea,
                        keys
                    }
                },
                () => callback()
            );
        },
        clear(callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.clear',
                    message: {
                        area: storageArea,
                    }
                },
                () => callback()
            );
        },
    };
}

var runtimeListenerAdded = false;

module.exports = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    onChanged: {
        addListener(callback) {
            if (!runtimeListenerAdded) {
                chrome.runtime.onMessage.addListener(function (message) {
                    if (message.type === '__topee_storage') {
                        changeEmitter.emit('storage', message.changes, message.area);
                    }
                });
                runtimeListenerAdded = true;
            }
            changeEmitter.on('storage', callback);
        },
        removeListener(callback) {
            changeEmitter.off('storage', callback);
        }
    }
};
