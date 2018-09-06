var tabInfo = require('./tabInfo.js');

var bridge = {};

function dispatchRequest(tabId, payload) {
    payload.tabId = tabId;
    safari.extension.dispatchMessage('request', {
        tabId: tabId,
        payload: payload
    });
}

bridge.dispatchRequest = function(payload) {
    tabInfo.tabId.then(tabId => {
        dispatchRequest(tabId, payload);
    });
};

tabInfo.tabId.then(tabId => {
    bridge.dispatchRequest = function (payload) {
        dispatchRequest(tabId, payload);
    };
});

module.exports = bridge;
