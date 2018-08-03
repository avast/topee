'use strict';

var eventEmitter = require('../event-bus.js');

var tabs = {};

tabs.sendMessage = function (tabId, message, options, responseCallback) {
	var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

	if (typeof options === 'function') {
		responseCallback = options;
	}

	if (responseCallback) {
		eventEmitter.addListener('messageResponse', onResponse);
	}

    window.webkit.messageHandlers.content.postMessage({
        tabId: tabId,
        eventName: 'request',
        frameId: (options && options.frameId) || undefined,
	    messageId: messageId,
    	payload: message
    });

    function onResponse(payload) {
    	if (payload.messageId === messageId) {
    		responseCallback(payload.message);
    		eventEmitter.removeListener('messageResponse', onResponse);
    	}
    }
};

var browserTabs = {};

eventEmitter.addListener('hello', function (payload) {
	if (payload.frameId !== 0) { return; }
	browserTabs[payload.tabId] = {
		id: payload.tabId,
		url: payload.url
	};
});

tabs.query = function(queryInfo, callback) {
	var browerTabsArray = [];
	for (var tab in browserTabs) {
		browerTabsArray.push(browserTabs[tab]);
	}
	callback(browerTabsArray);
}

tabs.sendMessage._emit = function (payload) {
	eventEmitter.emit('messageResponse', payload);
};

module.exports = tabs;
