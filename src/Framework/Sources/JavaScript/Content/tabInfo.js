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
            if (msg.data && msg.data.type === tabInfo.Event.GET_TAB_ID) {
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
            if (msg.data && msg.data.type === tabInfo.Event.TAB_ID && typeof msg.data.detail === 'number') {
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

// True if hello has been sent and bye wasn't yet. This prevents multiple
// hellos/byes being sent from same page (as we listen on multiple load/unload
// events).
window.isTabRegistered = false;

function sayHello() {
    var tabId = isNaN(storedTabId) ? null : storedTabId;
    if (tabId === null) {
        if (helloWithNullTabIdSent)
            return;
        helloWithNullTabIdSent = true;
    }

    if (window.isTabRegistered) {
        return;
    }

    console.debug(`topee.hello(tabId: ${tabId}, referrer: "${document.referrer}", historyLength: ${history.length}) @ ${window.location.href}`);

    safari.extension.dispatchMessage('hello', {
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        frameId: tabInfo.frameId,
        payload: {
            tabId: tabId,
            frameId: tabInfo.frameId,
            eventName: 'hello',
            url: window.location.href
        }
    });

    window.isTabRegistered = true;
}

function sayBye(event) {
    var tabId = isNaN(storedTabId) ? null : storedTabId;

    if (!window.isTabRegistered) {
        return;
    }

    console.debug(`topee.bye(tabId: ${tabId}, url: ${window.location.href}`);

    safari.extension.dispatchMessage('bye', {
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        payload: {
            tabId: tabId,
            eventName: 'bye',
            reason: event ? event.type : 'unknown',
            url: window.location.href
        }
    });

    window.isTabRegistered = false;
}



module.exports = tabInfo;
