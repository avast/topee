
'use strict';

const background = require('../background-bridge');

var storage = {
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
                    items
                }
            }
            // (resp) => callback(resp)
        );
    }
};

module.exports = {
    local: storage,
    sync: storage,
    managed: {
        get() {
            return new Promise(function (resolve) {
                resolve({});
            });
        }
    },
    onChanged: {
        addListener() {},
        removeListener() {},
    },
};
