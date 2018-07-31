document.addEventListener("DOMContentLoaded", function(event) {
    topee.tabId.then(tabId => safari.extension.dispatchMessage('hello', {
        tabId: tabId,
        frameId: topee.frameId
    }));
});
