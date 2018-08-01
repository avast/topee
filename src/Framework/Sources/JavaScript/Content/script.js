window.chrome = require('./chrome/index.js');
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


// TODO: move to demo code
chrome.runtime.sendMessage('ping', console.log.bind(console));

chrome.runtime.sendMessage({type: 'ping', value: 1}, console.log.bind(console, 'first'));
chrome.runtime.sendMessage({type: 'ping', value: 2}, console.log.bind(console, 'second'));
