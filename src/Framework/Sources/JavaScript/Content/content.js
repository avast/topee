(function () {

if (typeof window.chrome === 'object') {
    console.log('chrome api already loaded');

    if (typeof window.chrome._tabId !== 'undefined') {
        window.addEventListener('pagehide', sayBye);
        window.addEventListener('beforeunload', sayBye);
    }

    return;
}

var URL_POLL_VISIBLE = 500;
var URL_POLL_HIDDEN = 5000;

window.chrome = require('./chrome/index.js');
var tabInfo = require('./tabInfo.js');

// the non-existence of window.chrome on the top makes sure that this listener is installed only once
var iframesParent = require('./iframes.js');
iframesParent.install();

if (window === window.top) {
    window.chrome._tabId = tabInfo.topLevelTabId;
    sayHello(tabInfo.topLevelTabId);
}
else {
    tabInfo.tabId.then(tabId => sayHello(tabId));
}

window.addEventListener('pageshow', function() {
    // When user navigates back Safari ressurects page so we need to trigger hello also in
    // this case (because was dereferenced using beforeunload)
    tabInfo.tabId.then(tabId => sayHello(tabId));
});

var lastUrl = window.location.href;

if (window === window.top) {
    window.addEventListener('pagehide', sayBye);
    window.addEventListener('beforeunload', sayBye);

    // history API has no change notification, so we have to use polling
    var scheduleMs = document.visibilityState === 'visible' ? URL_POLL_VISIBLE : URL_POLL_HIDDEN;
    var visibilityPoll = setInterval(visibilityHello, scheduleMs);
    document.addEventListener('visibilitychange', function () {
        clearInterval(visibilityPoll);
        if (document.visibilityState === 'visible') {
            visibilityHello();
            scheduleMs =  URL_POLL_VISIBLE;
        }
        else {
            scheduleMs = URL_POLL_HIDDEN;
        }
        visibilityPoll = setInterval(visibilityHello, scheduleMs);            
    });
}

function visibilityHello() {
    if (document.visibilityState !== 'prerender' && window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        sayHello(tabInfo.topLevelTabId);
    }
}

function sayHello(tabId) {
    safari.extension.dispatchMessage('hello', {
        tabId: tabId,
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
    safari.extension.dispatchMessage('bye', {
        tabId: window.chrome._tabId,
        payload: JSON.stringify({
            tabId: window.chrome._tabId,
            eventName: 'bye',
            reason: event ? event.type : 'unknown',
            url: window.location.href
        })
    });
}

})();
