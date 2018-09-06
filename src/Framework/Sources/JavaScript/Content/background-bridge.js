var tabInfo = require('./tabInfo.js');

var bridge = {};

bridge.dispatchRequest = function(payload) {
    tabInfo.tabId.then(tabId => {
        payload.tabId = tabId;
        safari.extension.dispatchMessage('request', {
            tabId: tabId,
            payload: payload
        });
    });
};

tabInfo.tabId.then(tabId => {
    bridge.dispatchRequest = function (payload) {
        payload.tabId = tabId;
        safari.extension.dispatchMessage('request', {
            tabId: tabId,
            payload: payload
        });
    };
});

module.exports = bridge;
