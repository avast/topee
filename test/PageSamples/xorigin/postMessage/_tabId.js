// create / get tab id
(function () {
    'use strict';

    if (!window.topee) {
        window.topee = {};
    }
    if (!topee.Event) {
        topee.Event = {};
    }

    topee.Event.getTabId = 'topee.getTabId';
    topee.Event.tabId = 'topee.tabId'; 

    if (window === window.top) {
        var topLevelTabId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        topee.tabId = Promise.resolve(topLevelTabId);
        window.addEventListener('message', function (msg) {
            if (msg.data.type === topee.Event.getTabId) {
                msg.source.postMessage({ type: topee.Event.tabId, detail: topLevelTabId }, msg.origin);
            }
        });
    }
    else {
        var poller;

        topee.tabId = new Promise(function (resolve) {
            window.addEventListener('message', function (msg) {
                if (msg.data.type === topee.Event.tabId) {
                    resolve(msg.data.detail);
                    clearInterval(poller);
                }
            });
        });
        poller = setInterval(function () {
            window.top.postMessage({ type: topee.Event.getTabId }, '*');
        }, 200);
        window.top.postMessage({ type: topee.Event.getTabId }, '*');        
    }
})();
