(function () {

if (typeof window.chrome === 'object') {
    console.log('chrome api already loaded');

    if (typeof window.chrome._tabId !== 'undefined') {
        window.addEventListener('pagehide', sayBye);
        window.addEventListener('beforeunload', sayBye);
    }

    return;
}

window.chrome = require('./chrome/index.js');
var tabInfo = require('./tabInfo.js');

if (window === window.top) {
    window.chrome._tabId = tabInfo.topLevelTabId;
    sayHello(tabInfo.topLevelTabId);
}
else {
    tabInfo.tabId.then(tabId => sayHello(tabId));
}

window.addEventListener('pageshow', function(event) {
    // When user navigates back Safari ressurects page so we need to trigger hello also in
    // this case (because was dereferenced using beforeunload)
    tabInfo.tabId.then(tabId => sayHello(tabId));
});

if (window === window.top) {
    window.addEventListener('pagehide', sayBye);
    window.addEventListener('beforeunload', sayBye);
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
