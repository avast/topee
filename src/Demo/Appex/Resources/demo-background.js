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
        else if (typeof namespace[funcName] === 'function') {
            namespace[funcName].apply(namespace, listeners[key].arguments);
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
    if (message.type === 'jasmine.setup') {
        sendResponse(setupListeners(message.value));
        return;
    }
    if (message.type === 'jasmine.shutdown') {
        sendResponse(shutdownListeners(message.value));
        return;
    }
    if (message.type && Object.values(activeListeners).some(l => l.type === message.type)) {
        return;
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
