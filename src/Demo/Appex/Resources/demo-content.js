chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log('got', JSON.stringify(message), 'from the background');
	if (message.type === 'ping') {
		sendResponse('content pong #' + message.value);
		return;
	}
});
chrome.runtime.sendMessage({type: 'ping', value: 1}, console.log.bind(console, 'first'));
chrome.runtime.sendMessage({type: 'ping', value: 2}, console.log.bind(console, 'second'));

document.addEventListener('DOMContentLoaded', function () {
  console.log(location.href, 'opening page', safari.extension.baseURI + 'dialog.html')
  var f = document.createElement('iframe');
  f.src = safari.extension.baseURI + 'dialog.html';
  document.body.appendChild(f);
});

