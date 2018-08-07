window.chrome = require('./chrome/index.js');
var tabInfo = require('./tabInfo.js');

if (window === window.top) {
    sayHello(tabInfo.topLevelTabId);
}
else {
    tabInfo.tabId.then(tabId => sayHello(tabId));
}

window.addEventListener("pageshow", function(event) {
    // When user navigates back Safari ressurects page so we need to trigger hello also in
    // this case (because was dereferenced using beforeunload)
    tabInfo.tabId.then(tabId => sayHello(tabId));
});

if (window === window.top) {
    window.addEventListener('beforeunload', function () {
        safari.extension.dispatchMessage('bye', {
            tabId: tabInfo.topLevelTabId,
            payload: JSON.stringify({
                tabId: tabInfo.topLevelTabId,
                eventName: 'bye',
                url: window.location.href
            })
        });
    });
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