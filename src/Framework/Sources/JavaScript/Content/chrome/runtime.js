'use strict';

var tabInfo = require('../tabInfo.js');

var runtime = {};

// TODO: once tabId is fulfilled, sendMessage should call dispatchMessage right away, not in then(), that might be performed asynchronously
runtime.sendMessage = function(message, callback) {
	var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
	tabInfo.tabId.then(tabId => {
		safari.extension.dispatchMessage('request', {
        	tabId: tabId,
        	payload: JSON.stringify({
        		tabId: tabId,
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

module.exports = runtime;
