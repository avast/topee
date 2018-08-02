chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log('got', message, 'from the background');
	sendResponse('content pong #' + message.value);
});
chrome.runtime.sendMessage({type: 'ping', value: 1}, console.log.bind(console, 'first'));
chrome.runtime.sendMessage({type: 'ping', value: 2}, console.log.bind(console, 'second'));
