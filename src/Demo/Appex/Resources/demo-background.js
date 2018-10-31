var bgPingCount = 0;

var activeListeners = {};
function setupListeners(listeners) {
    var namespace;
    var listenerIds = {};

    for (var key in listeners) {
        namespace = window;
        var parts = key.split('.');
        var funcName = parts.pop();
        parts.forEach(p => {
            if (typeof namespace[p] === 'undefined') {
                console.error("'" + p + "'", 'is undefined (processing', key, ')');
            }
            namespace = namespace[p];
        });

        if (typeof namespace[funcName] === 'function' && funcName === 'addListener') {
            listenerIds[key] = installListener(namespace, listeners[key]);
        }
        else {
            console.error("'" + funcName + "'", 'is not a function (processing', key, ')');
        }
    }

    return listenerIds;

    function installListener(namespace, context) {
        var id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        activeListeners[id] = {
            listener: function (message, sender, sendResponse) {
                if (context.type === message.type) {
//                    message.processed = true;
                    sendResponse(context.response);
                }
            },
            type: context.type,
            namespace: namespace
        };
        namespace['addListener'](activeListeners[id].listener);
        return id;
    }
}

function invokeFunction(context, sender, sendResponse) {
    var key = context.name;
    namespace = window;
    var parts = key.split('.');
    var funcName = parts.pop();
    parts.forEach(p => {
        if (typeof namespace[p] === 'undefined') {
            console.error("'" + p + "'", 'is undefined (processing', key, ')');
        }
        namespace = namespace[p];
    });

    if (typeof namespace[funcName] === 'function' && funcName === 'addListener') {
        console.error('use test.setupListeners to setup a listener (processing', key, ')');
    }
    else if (typeof namespace[funcName] === 'function') {
        var args = [];
        if (context.arguments) {
            if (Array.isArray(context.arguments)) {
                args = context.arguments.slice();
            }
            else {
                args = [ context.arguments ];
            }
        }
        if (context.wantCallback) {
            args.push(sendResponse);
            if (context.wantReturnValue) {
                console.error(key, ': wantCallback and wantReturnValue are mutually exclusive');
            }
        }
        var rv = namespace[funcName].apply(namespace, args);
        if (context.wantReturnValue) {
            sendResponse(rv);
        }
    }
    else {
        console.error("'" + funcName + "'", 'is not a function (processing', key, ')');
    }
}

function shutdownListeners(listeners) {
    var count = 0;

    for (var key in listeners) {
        if (!activeListeners[listeners[key]]) {
            console.error('listener', key, 'not found');
            continue;
        }
        var listenerEntry = activeListeners[listeners[key]];
        listenerEntry.namespace['removeListener'](listenerEntry.listener);
        delete activeListeners[listeners[key]];
        ++count;
    }

    return count;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'test.whoami') {
        sendResponse({
          tabId: sender.tab.id,
          frameId: sender.frameId
        });
        return;
    }
    if (message.type === 'test.setupListeners') {
        sendResponse(setupListeners(message.value));
        return;
    }
    if (message.type === 'test.backgroundInvoke') {
        invokeFunction(message.value, sender, sendResponse);
        return;
    }
    if (message.type === 'test.shutdownListeners') {
        sendResponse(shutdownListeners(message.value));
        return;
    }
    if (message.type === 'test.backgroundRequestResponse') {
        chrome.tabs.sendMessage(sender.tab.id, {type: 'test.backgroundRequestResponse.request' }, {}, function (message) {
            if (message === 'test.backgroundRequestResponse.response') {
                // Let content script know that sendMessage callback has been called successfuly
                chrome.tabs.sendMessage(sender.tab.id, {type: 'test.backgroundRequestResponse.success' }, {});
            }
        });
    }
    if (message.type && Object.values(activeListeners).some(l => l.type === message.type)) {
        return;
    }

    if (message.type === 'getDemoDlgBackground') {
        sendResponse(Math.random() >= 0.5 ? 'pink' : 'honeydew');
        setTimeout(function () {
            chrome.tabs.sendMessage(sender.tab.id, {type: 'changeDemoDlgBackground', value: Math.random() >= 0.5 ? 'lavender' : 'papayawhip' }, { frameId: sender.frameId });
        }, 3000);
    }
    sendResponse("background pong #" + message.value);

    setTimeout(function () {
    	chrome.tabs.sendMessage(sender.tab.id, {type: 'ping', value: ++bgPingCount }, { frameId: sender.frameId }, function (response)  {
    		console.log(response);
    	})
    }, 200);
});

setTimeout(function () {
	chrome.tabs.query({ url: 'http://localhost:8000/ifra*'}, function (tabs) {
		tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, {type: 'query'} ));
	});
}, 10000);
