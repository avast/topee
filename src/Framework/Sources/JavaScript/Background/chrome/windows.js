'use strict';

var windows = {
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2
};

windows.getAll = function (getInfo, callback) {
    if (callback) {
        setTimeout(function () {
            callback([]);
        }, 0);
    }
};

windows.create = function (createData, callback) {
    window.webkit.messageHandlers.appex.postMessage({
        type: 'createWindow',
        url: typeof createData.url === 'undefined' ? 'favorites://' : createData.url
    });

    if (callback) {
        setTimeout(function () {
            callback({ id: windows.WINDOW_ID_CURRENT });
        }, 0);
    }
};

windows.update = function (id, updateData, callback) {
    if (callback) {
        setTimeout(function () {
            callback({ id: id });
        }, 0);
    }
};

module.exports = windows;
