
'use strict';

const background = require('../background-bridge');

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
                        keys
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

module.exports = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    onChanged: {
        addListener(callback) {
            var listenerId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            background.dispatchRequest(
                {
                    eventName: 'storage.onChanged',
                    listenerId,
                }
            );
            safari.self.addEventListener('message', function (event) {
                if (event.name !== 'response') console.log('safari event', event);
                if (event.name === 'storage.onChanged' && event.message.listenerId === listenerId) {
                    callback(event.message.payload);
                }
            });
        },
    },
};
