window.addEventListener("pageshow", function(event) {
    topee.tabId.then(tabId => safari.extension.dispatchMessage('hello', {
        tabId: tabId,
        frameId: topee.frameId
    }));
});

if (window === window.top) {
    window.addEventListener('beforeunload', function () {
        safari.extension.dispatchMessage('bye', {
            tabId: topee.topLevelTabId
        });
    });
}
