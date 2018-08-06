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
    var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    safari.self.addEventListener("message", function (event) {
    	if (event.name === 'response' && event.message.messageId === messageId) {
            console.log('topee.keepalive reponse');
    	}
    });    
    setInterval(function () {
        console.log('send topee.keepalive');
        safari.extension.dispatchMessage('request', {
            tabId: tabInfo.topLevelTabId,
            payload: JSON.stringify({
                tabId: tabInfo.topLevelTabId,
                eventName: 'topee.keepalive',
                frameId: tabInfo.frameId,
                messageId: messageId,
                url: window.location.href,
                message: {}
            })
        });
    }, 100);    
    console.log('send topee.keepalive');
    safari.extension.dispatchMessage('request', {
        tabId: tabInfo.topLevelTabId,
        payload: JSON.stringify({
            tabId: tabInfo.topLevelTabId,
            eventName: 'topee.keepalive',
            frameId: tabInfo.frameId,
            messageId: messageId,
            url: window.location.href,
            message: {}
        })
    });
    window.addEventListener('beforeunload', function () {
        safari.extension.dispatchMessage('bye', {
            tabId: tabInfo.topLevelTabId
        });
    });
}
