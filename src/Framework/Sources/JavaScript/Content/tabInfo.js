// create / get tab id
'use strict';

var tabInfo = {
    Event: {
        GET_TAB_ID: 'topee.tabInfo.getTabId',
        TAB_ID: 'topee.tabInfo.tabId'
    },

    init: init,
    sayHello: sayHello,
    sayBye: sayBye
};

var setTabId;
tabInfo.tabId = new Promise(function (resolve) {
    setTabId = resolve;
});


if (window === window.top) {
    tabInfo.frameId = 0;
}
else {
    tabInfo.frameId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// this will break when navigating somewhere and then back here, because referrer is not what it should be in this case
// sessionStorage forks, so further writes to it don't affect the original (that called window.open) document's sessionStorage
var storedTabId = window.opener ? NaN : parseInt(sessionStorage.getItem('topee_tabId'));
var helloWithNullTabIdSent = false;

function init() {
    if (window === window.top) {
        // tabId responder
        window.addEventListener('message', function (msg) {
            if (msg.data.type === tabInfo.Event.GET_TAB_ID) {
                tabInfo.tabId.then(id => msg.source.postMessage({ type: tabInfo.Event.TAB_ID, detail: id }, msg.origin));
            }
        });
    }

    if (!isNaN(storedTabId)) {
        setTabId(storedTabId);
        return;
    }

    if (window === window.top) {
        // should arrive as a response to sayHello
        safari.self.addEventListener("message", function (event) {
            if (event.name === 'forceTabId' && event.message && typeof event.message.tabId === 'number') {
                storedTabId = event.message.tabId;
                sessionStorage.setItem('topee_tabId', storedTabId);
                setTabId(event.message.tabId);
            }
        });
        return;
    }


    if (window !== window.top) {
        var poller;
        window.addEventListener('message', function (msg) {
            if (msg.data.type === tabInfo.Event.TAB_ID && typeof msg.data.detail === 'number') {
                storedTabId = msg.data.detail;
                setTabId(msg.data.detail);
                clearInterval(poller);
            }
        });
        poller = setInterval(function () {
            window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
        }, 200);
        window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
        return;
    }
}

function sayHello() {
    var tabId = isNaN(storedTabId) ? null : storedTabId;
    if (tabId === null) {
        if (helloWithNullTabIdSent)
            return;
        helloWithNullTabIdSent = true;
    }

    safari.extension.dispatchMessage('hello', {
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        frameId: tabInfo.frameId,
        payload: JSON.stringify({
            tabId: tabId,
            frameId: tabInfo.frameId,
            eventName: 'hello',
            url: window.location.href
        })
    });
}

function sayBye(event) {
    var tabId = isNaN(storedTabId) ? null : storedTabId;

    safari.extension.dispatchMessage('bye', {
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        payload: JSON.stringify({
            tabId: tabId,
            eventName: 'bye',
            reason: event ? event.type : 'unknown',
            url: window.location.href
        })
    });
}



module.exports = tabInfo;
