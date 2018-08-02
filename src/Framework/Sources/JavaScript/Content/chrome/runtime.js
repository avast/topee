'use strict';

var EventEmitter = require('events');
var tabInfo = require('../tabInfo.js');

var runtime = {};

var eventEmitter = new EventEmitter();

// TODO: once tabId is fulfilled, sendMessage should call dispatchMessage right away, not in then(), that might be performed asynchronously
runtime.sendMessage = function(message, callback) {
	var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
	tabInfo.tabId.then(tabId => {
		safari.extension.dispatchMessage('request', {
        	tabId: tabId,
        	payload: JSON.stringify({
        		tabId: tabId,
                eventName: 'sendMessage',
        		frameId: tabInfo.frameId,
				messageId: messageId,
				url: window.location.href,
        		message: message
        	})
    	});
    });

    if (callback) {
    	safari.self.addEventListener("message", listener);
    }

    function listener(event) {
    	if (event.name === 'response' && event.message.messageId === messageId) {
    		callback(event.message.payload);
    		safari.self.removeEventListener(listener);
    	}
    }
};

runtime.onMessage = {
    addListener: function(callback) {
        eventEmitter.addListener('message', function (message, sender, sendResponse) {
            callback(message, sender, sendResponse);
        });
    },
/*    removeListener: function(callback) {
        eventEmitter.removeListener('message', ...)
    }*/
};

safari.self.addEventListener("message", function (event) {
    if (event.name === 'request' && (!event.message.frameId || event.message.frameId === tabInfo.frameId)) {
        tabInfo.tabId.then(tabId => {
            eventEmitter.emit('message', event.message.payload, {id: 'topee'}, function (message) {
                safari.extension.dispatchMessage('request', {
                    tabId: tabId,
                    payload: JSON.stringify({
                        tabId: tabId,
                        eventName: 'messageResponse',
                        frameId: tabInfo.frameId,
                        messageId: event.message.messageId,
                        url: window.location.href,
                        message: message
                    })
                });
            });
        });
    }
});

module.exports = runtime;
