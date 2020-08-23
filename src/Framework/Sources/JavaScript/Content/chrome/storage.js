
'use strict';

const background = require('../background-bridge');
const EventEmitter = require('events');
const changeEmitter = new EventEmitter();
const runtime = require('./runtime.js');

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
        set(items) {
            background.dispatchRequest(
                {
                    eventName: 'storage.set',
                    message: {
                        area: storageArea,
                        items
                    }
                }
                // (resp) => callback(resp)
            );
        }
    };
}

runtime.onMessage.addListener(function (message) {
    if (message.type === '__topee_storage') {
        changeEmitter.emit('storage', message.changes, message.area);
    }
});

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
