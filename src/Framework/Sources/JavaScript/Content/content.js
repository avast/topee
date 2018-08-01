window.chrome = require('./chrome/index.js');
var tabInfo = require('./tabInfo.js');

if (window === window.top) {
    safari.extension.dispatchMessage('hello', {
        tabId: tabInfo.topLevelTabId,
        frameId: tabInfo.frameId
    });
}
else {
    tabInfo.tabId.then(tabId => {
        safari.extension.dispatchMessage('hello', {
            tabId: tabId,
            frameId: tabInfo.frameId
        })
    });
}

window.addEventListener("pageshow", function(event) {
    // When user navigates back Safari ressurects page so we need to trigger hello also in
    // this case (because was dereferenced using beforeunload)
    tabInfo.tabId.then(tabId => {
        safari.extension.dispatchMessage('hello', {
            tabId: tabId,
            frameId: tabInfo.frameId
        })
    });
});

if (window === window.top) {
    window.addEventListener('beforeunload', function () {
        safari.extension.dispatchMessage('bye', {
            tabId: tabInfo.topLevelTabId
        });
    });
}
