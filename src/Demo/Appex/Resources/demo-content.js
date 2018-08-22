chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log('got', JSON.stringify(message), 'from the background');
	if (message.type === 'ping') {
		sendResponse('content pong #' + message.value);
		return;
	}
});
chrome.runtime.sendMessage({type: 'ping', value: 1}, console.log.bind(console, 'first'));
chrome.runtime.sendMessage({type: 'ping', value: 2}, console.log.bind(console, 'second'));

var dlg = null;
document.addEventListener('click', function (event) {
  if (dlg) {
    document.body.removeChild(dlg);
    dlg = null;
    return;
  }

  if (!event.altKey) {
    return;
  }

  dlg = document.createElement('iframe');
  dlg.src = chrome.runtime.getURL('dialog.html');
  dlg.style.position = 'absolute';
  dlg.style.left = Math.floor(event.clientX) + 'px';
  dlg.style.top = Math.floor(event.clientY) + 'px';
  document.body.appendChild(dlg);
});
