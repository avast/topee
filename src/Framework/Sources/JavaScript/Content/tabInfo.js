// create / get tab id
'use strict';

var tabInfo = {
    Event: {
        GET_TAB_ID: 'topee.tabInfo.getTabId',
        TAB_ID: 'topee.tabInfo.tabId'
    }
};

if (window === window.top) {
    tabInfo.frameId = 0;
    tabInfo.topLevelTabId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    tabInfo.tabId = Promise.resolve(tabInfo.topLevelTabId);
    window.addEventListener('message', function (msg) {
        if (msg.data.type === tabInfo.Event.GET_TAB_ID) {
            msg.source.postMessage({ type: tabInfo.Event.TAB_ID, detail: tabInfo.topLevelTabId }, msg.origin);
        }
    });
}
else {
    var poller;

    tabInfo.frameId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    tabInfo.tabId = new Promise(function (resolve) {
        window.addEventListener('message', function (msg) {
            if (msg.data.type === tabInfo.Event.TAB_ID) {
                resolve(msg.data.detail);
                clearInterval(poller);
            }
        });
    });
    poller = setInterval(function () {
        window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
    }, 200);
    window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
}

module.exports = tabInfo;
