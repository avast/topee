var bgPingCount = 0;

var activeListeners = {};
function setupListeners(listeners, namespace) {
    if (!namespace) {
        namespace = window;
    }

    var listenerIds = {};

    for (var key in listeners) {
        if (typeof namespace[key] === 'function' && key === 'addListener') {
            listenerIds[key] = installListener(namespace[key], listeners[key]);
        }
        else if (typeof namespace[key] === 'function') {
            namespace[key].apply(namespace, listeners[key].arguments);
        }
        else {
            listenerIds[key] = setupListeners(listeners[key], namespace[key]);
        }
    }

    return listenerIds;

    function installListener(f, context) {
        var id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        activeListeners[id] = {
            listener: function (message, sender, sendResponse) {
                if (context[message.type]) {
                    message.processed = true;
                    sendResponse(context[message.type]);
                }
            },
            type: Object.keys(context)[0]
        };
        f(activeListeners[id].listener);
        return id;
    }
}

function shutdownListeners(listeners, namespace) {
    if (!namespace) {
        namespace = window;
    }

    var count = 0;
    
    for (var key in listeners) {
        if (typeof namespace[key] === 'function' && key === 'addListener') {
            ++count;
            namespace.removeListener(activeListeners[listeners[key]].listener);
            delete activeListeners[listeners[key]];
        }
        else if (typeof namespace[key] !== 'function') {
            count += shutdownListeners(listeners[key], namespace[key]);
        }
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
