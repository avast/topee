var bgPingCount = 0;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    sendResponse("background pong #" + message.value);

    setTimeout(function () {
    	chrome.tabs.sendMessage(sender.tab.id, {type: 'ping', value: ++bgPingCount }, { frameId: sender.frameId }, function (response)  {
    		console.log(response);
    	})
    }, 200);
});
