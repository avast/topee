var tabInfo = require('./tabInfo.js');

window.addEventListener("pageshow", function(event) {
    tabInfo.tabId.then(tabId => safari.extension.dispatchMessage('hello', {
        tabId: tabId,
        frameId: tabInfo.frameId
    }));
});

if (window === window.top) {
    window.addEventListener('beforeunload', function () {
        safari.extension.dispatchMessage('bye', {
            tabId: tabInfo.topLevelTabId
        });
    });
}
